import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRoomAtPoint,
  findWaypointPath,
  stepCharacterMovement,
  calculateProductivityMetrics,
  formatInWorldTime,
  getTimeOfDayFromMinutes,
  filterTasks,
  advanceTaskSimulation,
} from './simulationLogic';
import { INITIAL_AGENTS, INITIAL_TASKS, CORRIDOR_Y } from '../data/officeData';

test('getRoomAtPoint identifies all six office rooms accurately', () => {
  assert.equal(getRoomAtPoint({ x: 200, y: 200 }), 'main-workspace');
  assert.equal(getRoomAtPoint({ x: 750, y: 200 }), 'creative-studio');
  assert.equal(getRoomAtPoint({ x: 1250, y: 200 }), 'meeting-room');
  assert.equal(getRoomAtPoint({ x: 200, y: 750 }), 'break-room');
  assert.equal(getRoomAtPoint({ x: 750, y: 750 }), 'quiet-focus');
  assert.equal(getRoomAtPoint({ x: 1250, y: 750 }), 'operations-room');
});

test('findWaypointPath routes cross-room movement through the central corridor', () => {
  const start = { x: 185, y: 242 }; // Main Workspace
  const end = { x: 1300, y: 265 }; // Meeting Room
  const path = findWaypointPath(start, end);

  assert.ok(path.length >= 4, 'Cross-room path should include doorway and corridor waypoints');
  const passesCorridor = path.some((pt) => pt.y === CORRIDOR_Y);
  assert.equal(passesCorridor, true, 'Cross-room path must route along central corridor');
  const last = path[path.length - 1];
  assert.deepEqual(last, end);
});

test('stepCharacterMovement moves character along path and transitions to working at desk', () => {
  const mochi = {
    ...INITIAL_AGENTS[0],
    position: { x: 185, y: 300 },
    deskPosition: { x: 185, y: 242 },
    path: [{ x: 185, y: 242 }],
    behavior: 'walking' as const,
  };

  const stepped = stepCharacterMovement(mochi, 1.0, 1.0);
  assert.equal(stepped.path.length, 0);
  assert.deepEqual(stepped.position, { x: 185, y: 242 });
  assert.equal(stepped.behavior, 'working');
});

test('calculateProductivityMetrics computes accurate live counts and completion percentage', () => {
  const metrics = calculateProductivityMetrics(INITIAL_AGENTS, INITIAL_TASKS);
  assert.equal(metrics.totalAgents, 10);
  assert.ok(metrics.workingCount >= 8);
  assert.ok(metrics.completedTasks >= 4);
  assert.ok(metrics.inProgressTasks >= 8);
  assert.ok(metrics.completionPercentage > 0 && metrics.completionPercentage < 100);
});

test('formatInWorldTime and getTimeOfDayFromMinutes map cycle segments properly', () => {
  assert.equal(formatInWorldTime(9 * 60 + 15), '09:15 AM');
  assert.equal(getTimeOfDayFromMinutes(9 * 60 + 15), 'Morning');
  assert.equal(getTimeOfDayFromMinutes(14 * 60), 'Afternoon');
  assert.equal(getTimeOfDayFromMinutes(18 * 60 + 30), 'Evening');
  assert.equal(getTimeOfDayFromMinutes(22 * 60), 'Night');
});

test('filterTasks filters by agent, status, room, priority, and search query', () => {
  const highOnly = filterTasks(INITIAL_TASKS, { priority: 'High' });
  assert.ok(highOnly.length > 0);
  assert.ok(highOnly.every((t) => t.priority === 'High'));

  const mochiTasks = filterTasks(INITIAL_TASKS, { agentId: 'agent-mochi' });
  assert.equal(mochiTasks.length, 3);

  const searchMatch = filterTasks(INITIAL_TASKS, { search: 'camera pan' });
  assert.equal(searchMatch.length, 1);
  assert.equal(searchMatch[0].assignedAgentId, 'agent-bean');
});

test('advanceTaskSimulation completes tasks at 100%, emits notifications, and promotes next queued task', () => {
  const sampleAgent = { ...INITIAL_AGENTS[0] };
  const sampleTasks = [
    {
      id: 't-active',
      title: 'Finish prototype',
      description: 'Test completion flow',
      assignedAgentId: sampleAgent.id,
      status: 'In Progress' as const,
      progress: 96,
      estimatedDuration: 10,
      priority: 'High' as const,
      roomId: 'main-workspace' as const,
    },
    {
      id: 't-queued',
      title: 'Follow-up research',
      description: 'Next queued item',
      assignedAgentId: sampleAgent.id,
      status: 'Queued' as const,
      progress: 0,
      estimatedDuration: 20,
      priority: 'Medium' as const,
      roomId: 'main-workspace' as const,
    },
  ];

  const res = advanceTaskSimulation(sampleTasks, [sampleAgent], 1.5, 1.0, '10:00 AM');
  const finished = res.tasks.find((t) => t.id === 't-active');
  const promoted = res.tasks.find((t) => t.id === 't-queued');

  assert.equal(finished?.status, 'Completed');
  assert.equal(finished?.progress, 100);
  assert.equal(promoted?.status, 'In Progress');
  assert.equal(res.newNotifications.length, 1);
  assert.ok(res.newEvents.some((e) => e.type === 'task-complete'));
});
