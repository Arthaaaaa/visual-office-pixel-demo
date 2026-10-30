import {
  AgentCharacter,
  TaskItem,
  ActivityEvent,
  AppNotification,
  ProductivityMetrics,
  Point,
  RoomId,
  TimeOfDay,
} from '../types/office';
import { ROOMS, ROOM_MAP, CORRIDOR_Y } from '../data/officeData';

export function getRoomAtPoint(p: Point): RoomId {
  for (const room of ROOMS) {
    const { x, y, width, height } = room.bounds;
    if (p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height) {
      return room.id;
    }
  }
  // If in corridor, pick nearest room horizontally & vertically
  let closestRoom: RoomId = 'main-workspace';
  let minDist = Infinity;
  for (const room of ROOMS) {
    const dx = p.x - room.center.x;
    const dy = p.y - room.center.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) {
      minDist = d;
      closestRoom = room.id;
    }
  }
  return closestRoom;
}

/**
 * Generates a clean, obstacle-aware waypoint path from `start` to `end`
 * routing through room doorways and the central horizontal corridor (y = 520)
 * when crossing between rooms.
 */
export function findWaypointPath(start: Point, end: Point): Point[] {
  const startRoomId = getRoomAtPoint(start);
  const endRoomId = getRoomAtPoint(end);

  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  if (dist < 6) {
    return [];
  }

  if (startRoomId === endRoomId) {
    // Inside the same room: use an L-shaped or direct clear interior step
    const midY = (start.y + end.y) / 2;
    if (Math.abs(start.x - end.x) > 90 && Math.abs(start.y - end.y) > 60) {
      return [
        { x: start.x, y: Math.round(midY) },
        { x: end.x, y: Math.round(midY) },
        { x: end.x, y: end.y },
      ];
    }
    return [{ x: end.x, y: end.y }];
  }

  const startRoom = ROOM_MAP[startRoomId];
  const endRoom = ROOM_MAP[endRoomId];

  const waypoints: Point[] = [];
  // 1. Align with start room doorway X inside room
  waypoints.push({ x: startRoom.doorway.x, y: start.y });
  // 2. Step through start room doorway
  waypoints.push({ x: startRoom.doorway.x, y: startRoom.doorway.y });
  // 3. Enter central corridor
  waypoints.push({ x: startRoom.doorway.x, y: CORRIDOR_Y });
  // 4. Walk along central corridor to target room doorway X
  if (startRoom.doorway.x !== endRoom.doorway.x) {
    waypoints.push({ x: endRoom.doorway.x, y: CORRIDOR_Y });
  }
  // 5. Step through target room doorway
  waypoints.push({ x: endRoom.doorway.x, y: endRoom.doorway.y });
  // 6. Step to destination Y aligned with doorway, then destination X
  waypoints.push({ x: endRoom.doorway.x, y: end.y });
  waypoints.push({ x: end.x, y: end.y });

  // Deduplicate consecutive identical points
  const filtered: Point[] = [];
  for (const pt of waypoints) {
    const prev = filtered[filtered.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 4) {
      filtered.push(pt);
    }
  }
  return filtered;
}

/**
 * Advances a character along their waypoint path by `dt` seconds.
 */
export function stepCharacterMovement(
  agent: AgentCharacter,
  dt: number,
  speedMultiplier = 1
): AgentCharacter {
  if (agent.path.length === 0) {
    return agent;
  }

  const target = agent.path[0];
  const dx = target.x - agent.position.x;
  const dy = target.y - agent.position.y;
  const dist = Math.hypot(dx, dy);
  const stepDist = agent.speed * speedMultiplier * dt;

  let nextPos: Point;
  let nextPath = agent.path;

  if (dist <= stepDist) {
    nextPos = { x: target.x, y: target.y };
    nextPath = agent.path.slice(1);
  } else {
    nextPos = {
      x: agent.position.x + (dx / dist) * stepDist,
      y: agent.position.y + (dy / dist) * stepDist,
    };
  }

  let direction = agent.direction;
  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx >= 0 ? 'right' : 'left';
  } else if (Math.abs(dy) > 0.5) {
    direction = dy >= 0 ? 'down' : 'up';
  }

  const currentRoomId = getRoomAtPoint(nextPos);
  const arrived = nextPath.length === 0;

  let nextBehavior = agent.behavior;
  if (!arrived) {
    nextBehavior = 'walking';
  } else if (agent.behavior === 'walking') {
    // Determine contextual behavior upon arrival
    const atDesk =
      Math.hypot(nextPos.x - agent.deskPosition.x, nextPos.y - agent.deskPosition.y) < 28;
    if (atDesk) {
      nextBehavior = 'working';
      direction = 'up';
    } else if (currentRoomId === 'break-room') {
      nextBehavior = 'taking-break';
    } else if (currentRoomId === 'meeting-room') {
      nextBehavior = 'in-meeting';
    } else {
      nextBehavior = 'idle';
    }
  }

  return {
    ...agent,
    position: nextPos,
    path: nextPath,
    direction,
    currentRoomId,
    behavior: nextBehavior,
  };
}

export function calculateProductivityMetrics(
  agents: AgentCharacter[],
  tasks: TaskItem[]
): ProductivityMetrics {
  const totalAgents = agents.length;
  const workingCount = agents.filter(
    (a) => a.behavior === 'working' || a.behavior === 'in-meeting' || a.behavior === 'completing-task'
  ).length;
  const idleOrBreakCount = totalAgents - workingCount;

  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const queuedTasks = tasks.filter((t) => t.status === 'Queued').length;
  const pausedTasks = tasks.filter((t) => t.status === 'Paused').length;

  const totalTasks = tasks.length;
  const totalWeightedProgress = tasks.reduce((sum, t) => {
    if (t.status === 'Completed') return sum + 100;
    return sum + t.progress;
  }, 0);

  const completionPercentage =
    totalTasks > 0 ? Math.round(totalWeightedProgress / totalTasks) : 0;

  let officeMood = 'Calm & Focused';
  if (workingCount >= Math.ceil(totalAgents * 0.8)) {
    officeMood = 'Deep Flow State';
  } else if (agents.some((a) => a.behavior === 'celebrating' as string || a.celebrationTimer > 0)) {
    officeMood = 'Celebrating Milestones';
  } else if (agents.filter((a) => a.behavior === 'taking-break').length >= 3) {
    officeMood = 'Cozy Coffee Break';
  }

  return {
    totalAgents,
    workingCount,
    idleOrBreakCount,
    inProgressTasks,
    completedTasks,
    queuedTasks,
    pausedTasks,
    completionPercentage,
    officeMood,
  };
}

export function formatInWorldTime(minutesFromMidnight: number): string {
  const normalized = ((Math.floor(minutesFromMidnight) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const hStr = String(hours12).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

export function getTimeOfDayFromMinutes(minutesFromMidnight: number): TimeOfDay {
  const normalized = ((Math.floor(minutesFromMidnight) % 1440) + 1440) % 1440;
  const hour = normalized / 60;
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 20.5) return 'Evening';
  return 'Night';
}

export interface TaskFilterCriteria {
  agentId?: string;
  status?: string;
  roomId?: string;
  priority?: string;
  search?: string;
}

export function filterTasks(
  tasks: TaskItem[],
  criteria: TaskFilterCriteria
): TaskItem[] {
  return tasks.filter((task) => {
    if (criteria.agentId && criteria.agentId !== 'ALL' && task.assignedAgentId !== criteria.agentId) {
      return false;
    }
    if (criteria.status && criteria.status !== 'ALL' && task.status !== criteria.status) {
      return false;
    }
    if (criteria.roomId && criteria.roomId !== 'ALL' && task.roomId !== criteria.roomId) {
      return false;
    }
    if (criteria.priority && criteria.priority !== 'ALL' && task.priority !== criteria.priority) {
      return false;
    }
    if (criteria.search && criteria.search.trim().length > 0) {
      const q = criteria.search.trim().toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesDesc = task.description.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc) return false;
    }
    return true;
  });
}

const COMPLETION_PHRASES = [
  (name: string, title: string) => `${name} finished "${title}"!`,
  (name: string, title: string) => `${name} wrapped up "${title}" with sparkle!`,
  (name: string, title: string) => `${name} completed "${title}" right on schedule!`,
  (name: string, title: string) => `${name} checked off "${title}"!`,
];

export interface SimulationStepResult {
  tasks: TaskItem[];
  agents: AgentCharacter[];
  newEvents: ActivityEvent[];
  newNotifications: AppNotification[];
}

export function advanceTaskSimulation(
  tasks: TaskItem[],
  agents: AgentCharacter[],
  dtSeconds: number,
  speedMultiplier: number,
  inWorldTimeStr: string
): SimulationStepResult {
  const newEvents: ActivityEvent[] = [];
  const newNotifications: AppNotification[] = [];
  const agentMap = new Map<string, AgentCharacter>();
  agents.forEach((a) => agentMap.set(a.id, { ...a }));

  const updatedTasks = tasks.map((t) => ({ ...t }));
  const completedAgentIds: string[] = [];

  for (let i = 0; i < updatedTasks.length; i++) {
    const task = updatedTasks[i];
    if (task.status !== 'In Progress') continue;

    const agent = agentMap.get(task.assignedAgentId);
    // Progress faster when agent is actively working or in-meeting, slightly slower when walking/break
    const stateFactor =
      !agent || agent.behavior === 'working' || agent.behavior === 'in-meeting'
        ? 1.0
        : agent.behavior === 'taking-break'
        ? 0.35
        : 0.65;

    const duration = Math.max(8, task.estimatedDuration);
    const deltaPercent = ((dtSeconds * speedMultiplier * stateFactor) / duration) * 100;
    const prevProgress = task.progress;
    const nextProgress = Math.min(100, prevProgress + deltaPercent);

    task.progress = Number(nextProgress.toFixed(1));

    // Check 50% halfway milestone
    if (prevProgress < 50 && nextProgress >= 50 && nextProgress < 100 && agent) {
      newEvents.push({
        id: `evt-half-${task.id}-${Date.now()}`,
        timestamp: 'Just now',
        inWorldTime: inWorldTimeStr,
        agentId: agent.id,
        agentName: agent.name,
        type: 'task-halfway',
        message: `${agent.name} reached 50% on "${task.title}".`,
        roomId: agent.currentRoomId,
      });
    }

    // Check 100% completion
    if (nextProgress >= 100) {
      task.progress = 100;
      task.status = 'Completed';
      task.completionTime = inWorldTimeStr;
      completedAgentIds.push(task.assignedAgentId);

      if (agent) {
        const phraseFn =
          COMPLETION_PHRASES[Math.abs(task.title.length + agent.name.length) % COMPLETION_PHRASES.length];
        const msg = phraseFn(agent.name, task.title);

        newEvents.push({
          id: `evt-done-${task.id}-${Date.now()}`,
          timestamp: 'Just now',
          inWorldTime: inWorldTimeStr,
          agentId: agent.id,
          agentName: agent.name,
          type: 'task-complete',
          message: msg,
          roomId: agent.currentRoomId,
        });

        newNotifications.push({
          id: `notif-${task.id}-${Date.now()}`,
          timestamp: inWorldTimeStr,
          agentId: agent.id,
          agentName: agent.name,
          taskTitle: task.title,
          message: msg,
          read: false,
          dismissed: false,
        });

        agent.behavior = 'completing-task';
        agent.celebrationTimer = 3.5;
        agent.speechBubble = 'Task complete!';
        agent.speechTimer = 3.5;
      }
    }
  }

  // Auto-promote next Queued task for any agent who has no In Progress task
  for (const [agentId, agent] of agentMap.entries()) {
    const hasInProgress = updatedTasks.some(
      (t) => t.assignedAgentId === agentId && t.status === 'In Progress'
    );
    if (!hasInProgress) {
      const nextQueued = updatedTasks.find(
        (t) => t.assignedAgentId === agentId && t.status === 'Queued'
      );
      if (nextQueued) {
        nextQueued.status = 'In Progress';
        nextQueued.startTime = inWorldTimeStr;
        nextQueued.progress = 2;
        if (completedAgentIds.includes(agentId)) {
          newEvents.push({
            id: `evt-start-${nextQueued.id}-${Date.now()}`,
            timestamp: 'Just now',
            inWorldTime: inWorldTimeStr,
            agentId: agent.id,
            agentName: agent.name,
            type: 'task-start',
            message: `${agent.name} started working on "${nextQueued.title}".`,
            roomId: nextQueued.roomId,
          });
        }
      } else if (completedAgentIds.includes(agentId)) {
        // Recycle earliest completed task into a fresh queued iteration so the office stays eternally alive
        const completedForAgent = updatedTasks.filter(
          (t) => t.assignedAgentId === agentId && t.status === 'Completed'
        );
        if (completedForAgent.length >= 2) {
          const oldest = completedForAgent[0];
          oldest.status = 'Queued';
          oldest.progress = 0;
          oldest.completionTime = undefined;
        }
      }
    }
  }

  return {
    tasks: updatedTasks,
    agents: Array.from(agentMap.values()),
    newEvents,
    newNotifications,
  };
}
