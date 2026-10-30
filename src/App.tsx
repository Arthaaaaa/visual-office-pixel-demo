import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveTab,
  AgentCharacter,
  TaskItem,
  ActivityEvent,
  AppNotification,
  CameraState,
  AppSettings,
  RoomId,
  TimeOfDay,
  TaskPriority,
  TaskStatus,
} from './types/office';
import {
  INITIAL_AGENTS,
  INITIAL_TASKS,
  INITIAL_ACTIVITY_LOG,
  DEFAULT_SETTINGS,
  ROOM_MAP,
  ROOM_HANGOUT_SPOTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from './data/officeData';
import {
  findWaypointPath,
  stepCharacterMovement,
  calculateProductivityMetrics,
  formatInWorldTime,
  getTimeOfDayFromMinutes,
  advanceTaskSimulation,
} from './utils/simulationLogic';
import { soundEngine } from './utils/soundEngine';
import { CharacterPortrait } from './components/CharacterPortrait';
import { OfficeViewport } from './components/OfficeViewport';
import { AgentInspector } from './components/AgentInspector';
import { ProductivityDashboard } from './components/ProductivityDashboard';
import {
  Building2,
  LayoutDashboard,
  Users,
  ListTodo,
  Activity,
  Settings as SettingsIcon,
  Bell,
  BellOff,
  Music,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Menu,
  Clock,
} from 'lucide-react';

const STORAGE_KEY = 'cozy_pixel_office_settings_v1';

function loadInitialSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Always start with music paused until user explicitly interacts (per browser autoplay policy)
      musicEnabled: false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);
  const [activeTab, setActiveTab] = useState<ActiveTab>('office');
  const [agents, setAgents] = useState<AgentCharacter[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>(INITIAL_ACTIVITY_LOG);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-init-1',
      timestamp: '09:00 AM',
      agentId: 'agent-toad',
      agentName: 'Matcha',
      taskTitle: 'Verify dark mode contrast across panels',
      message: 'Matcha completed "Verify dark mode contrast across panels"!',
      read: true,
      dismissed: true,
    },
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<RoomId | null>(null);
  const [preselectedAgentFilter, setPreselectedAgentFilter] = useState<string>('');

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(false);
  const [rightInspectorCollapsed, setRightInspectorCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState<boolean>(false);
  const [audioPanelOpen, setAudioPanelOpen] = useState<boolean>(false);

  // In-world clock in minutes from midnight (starts at 09:15 AM = 555)
  const [inWorldMinutes, setInWorldMinutes] = useState<number>(9 * 60 + 15);

  const [camera, setCamera] = useState<CameraState>({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    zoom: 0.54,
    followingAgentId: null,
  });

  // Sync dark mode class on <html> and persist settings to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota issues
    }
  }, [settings]);

  // Sync sound engine preferences
  useEffect(() => {
    soundEngine.syncPreferences({
      musicEnabled: settings.musicEnabled,
      musicVolume: settings.musicVolume,
      isMuted: settings.isMuted,
      ambientMode: settings.ambientMode,
      soundEffectsEnabled: settings.soundEffectsEnabled,
      sfxVolume: settings.sfxVolume,
    });
  }, [
    settings.musicEnabled,
    settings.musicVolume,
    settings.isMuted,
    settings.ambientMode,
    settings.soundEffectsEnabled,
    settings.sfxVolume,
  ]);

  // Refs for latest simulation state inside tick interval
  const simRef = useRef({
    agents,
    tasks,
    settings,
    inWorldMinutes,
  });

  useEffect(() => {
    simRef.current = { agents, tasks, settings, inWorldMinutes };
  }, [agents, tasks, settings, inWorldMinutes]);

  // Autonomous Character Movement & Task Progression Loop (runs at 10Hz)
  useEffect(() => {
    const dt = 0.1; // 100ms step
    const timer = window.setInterval(() => {
      const {
        agents: curAgents,
        tasks: curTasks,
        settings: curSettings,
        inWorldMinutes: curMins,
      } = simRef.current;

      if (!curSettings.simulationRunning || document.hidden) return;

      const speed = curSettings.simulationSpeed;
      const nextMins = (curMins + dt * speed * 0.8) % 1440;
      setInWorldMinutes(nextMins);

      if (curSettings.autoDayNight) {
        const autoTod = getTimeOfDayFromMinutes(nextMins);
        if (autoTod !== curSettings.timeOfDay) {
          setSettings((prev) => ({ ...prev, timeOfDay: autoTod }));
        }
      }

      const inWorldTimeStr = formatInWorldTime(nextMins);

      // 1. Step character movement and autonomous destination selection
      const freqMultiplier =
        curSettings.movementFrequency === 'Lively'
          ? 1.5
          : curSettings.movementFrequency === 'Calm'
          ? 0.6
          : 1.0;

      const movedAgents = curAgents.map((agent) => {
        let updated = stepCharacterMovement(agent, dt, speed);

        // Decrement timers
        if (updated.celebrationTimer > 0) {
          updated = {
            ...updated,
            celebrationTimer: Math.max(0, updated.celebrationTimer - dt),
          };
          if (updated.celebrationTimer === 0 && updated.behavior === 'completing-task') {
            updated.behavior = 'working';
          }
        }
        if ((updated.speechTimer ?? 0) > 0) {
          const nextSpeech = Math.max(0, (updated.speechTimer ?? 0) - dt);
          updated = {
            ...updated,
            speechTimer: nextSpeech,
            speechBubble: nextSpeech === 0 ? undefined : updated.speechBubble,
          };
        }

        updated = {
          ...updated,
          behaviorTimer: updated.behaviorTimer - dt * speed * freqMultiplier,
        };

        // When behaviorTimer expires and character is not currently walking, choose a natural next behavior
        if (updated.behaviorTimer <= 0 && updated.path.length === 0) {
          const roll = Math.random();
          if (updated.behavior === 'working' && roll < 0.28) {
            // Take a short walk to Break Room, Meeting Room, or hangout spot
            const destRooms: RoomId[] = ['break-room', 'meeting-room', updated.homeRoomId];
            const chosenRoom = destRooms[Math.floor(Math.random() * destRooms.length)];
            const spots = ROOM_HANGOUT_SPOTS[chosenRoom];
            const dest = spots[Math.floor(Math.random() * spots.length)];
            const path = findWaypointPath(updated.position, dest);
            updated = {
              ...updated,
              path,
              targetPosition: dest,
              behavior: path.length > 0 ? 'walking' : 'idle',
              behaviorTimer: 14 + Math.random() * 12,
              speechBubble:
                chosenRoom === 'break-room'
                  ? 'Coffee time!'
                  : chosenRoom === 'meeting-room'
                  ? 'Checking notes'
                  : undefined,
              speechTimer: chosenRoom === 'break-room' ? 3.5 : 0,
            };
          } else {
            // Return to their home desk workstation to work on tasks
            const distToDesk = Math.hypot(
              updated.position.x - updated.deskPosition.x,
              updated.position.y - updated.deskPosition.y
            );
            if (distToDesk > 20) {
              const path = findWaypointPath(updated.position, updated.deskPosition);
              updated = {
                ...updated,
                path,
                targetPosition: updated.deskPosition,
                behavior: 'walking',
                behaviorTimer: 18 + Math.random() * 14,
              };
            } else {
              updated = {
                ...updated,
                behavior: 'working',
                direction: 'up',
                behaviorTimer: 18 + Math.random() * 14,
              };
            }
          }
        }

        return updated;
      });

      // 2. Step task progress & check completions
      const stepRes = advanceTaskSimulation(
        curTasks,
        movedAgents,
        dt,
        speed,
        inWorldTimeStr
      );

      setAgents(stepRes.agents);
      setTasks(stepRes.tasks);

      if (stepRes.newEvents.length > 0) {
        setActivityLog((prev) => [...stepRes.newEvents, ...prev].slice(0, 60));
      }

      if (stepRes.newNotifications.length > 0) {
        // Always record in notification center; only show toast / play sound if notificationsEnabled
        const processedNotifs = stepRes.newNotifications.map((n) => ({
          ...n,
          dismissed: !curSettings.notificationsEnabled,
        }));
        setNotifications((prev) => [...processedNotifs, ...prev].slice(0, 40));

        if (curSettings.notificationsEnabled) {
          soundEngine.playTaskComplete(curSettings.notificationSoundsEnabled);
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss active completion toasts after 5.5 seconds
  useEffect(() => {
    const activeToasts = notifications.filter((n) => !n.dismissed);
    if (activeToasts.length === 0) return;
    const t = window.setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n, idx) => (idx === 0 && !n.dismissed ? { ...n, dismissed: true } : n))
      );
    }, 5500);
    return () => clearTimeout(t);
  }, [notifications]);

  // Handlers
  const handleSelectRoom = useCallback((roomId: RoomId | null) => {
    setSelectedRoomId(roomId);
    if (roomId === null) {
      setCamera((prev) => ({
        ...prev,
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        zoom: 0.54,
        followingAgentId: null,
      }));
    } else {
      const room = ROOM_MAP[roomId];
      if (room) {
        setCamera((prev) => ({
          ...prev,
          x: room.center.x,
          y: room.center.y,
          zoom: 1.15,
          followingAgentId: null,
        }));
      }
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    setSelectedRoomId(null);
    setCamera({
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      zoom: settings.defaultZoom || 0.54,
      followingAgentId: null,
    });
  }, [settings.defaultZoom]);

  const handleFocusAgent = useCallback((agent: AgentCharacter) => {
    setActiveTab('office');
    setSelectedAgentId(agent.id);
    setRightInspectorCollapsed(false);
    setCamera({
      x: agent.position.x,
      y: agent.position.y,
      zoom: 1.35,
      followingAgentId: null,
    });
  }, []);

  const handleToggleFollowAgent = useCallback(
    (agentId: string) => {
      setActiveTab('office');
      setCamera((prev) => ({
        ...prev,
        zoom: Math.max(prev.zoom, 1.25),
        followingAgentId: prev.followingAgentId === agentId ? null : agentId,
      }));
    },
    []
  );

  const handleSendAgentToBreak = useCallback(
    (agentId: string) => {
      const spots = ROOM_HANGOUT_SPOTS['break-room'];
      const dest = spots[Math.floor(Math.random() * spots.length)];
      const inWorldTimeStr = formatInWorldTime(inWorldMinutes);

      setAgents((prev) =>
        prev.map((a) => {
          if (a.id !== agentId) return a;
          const path = findWaypointPath(a.position, dest);
          return {
            ...a,
            path,
            targetPosition: dest,
            behavior: path.length > 0 ? 'walking' : 'taking-break',
            behaviorTimer: 22,
            speechBubble: 'Heading for coffee!',
            speechTimer: 4,
          };
        })
      );

      const targetAgent = agents.find((a) => a.id === agentId);
      if (targetAgent) {
        setActivityLog((prev) => [
          {
            id: `evt-break-${Date.now()}`,
            timestamp: 'Just now',
            inWorldTime: inWorldTimeStr,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            type: 'break',
            message: `${targetAgent.name} headed to the Cozy Break Room for a warm drink.`,
            roomId: 'break-room',
          },
          ...prev,
        ]);
      }
    },
    [agents, inWorldMinutes]
  );

  const handleReturnAgentToWork = useCallback(
    (agentId: string) => {
      const inWorldTimeStr = formatInWorldTime(inWorldMinutes);
      setAgents((prev) =>
        prev.map((a) => {
          if (a.id !== agentId) return a;
          const path = findWaypointPath(a.position, a.deskPosition);
          return {
            ...a,
            path,
            targetPosition: a.deskPosition,
            behavior: path.length > 0 ? 'walking' : 'working',
            behaviorTimer: 25,
            speechBubble: 'Back to my desk!',
            speechTimer: 3.5,
          };
        })
      );

      const targetAgent = agents.find((a) => a.id === agentId);
      if (targetAgent) {
        setActivityLog((prev) => [
          {
            id: `evt-work-${Date.now()}`,
            timestamp: 'Just now',
            inWorldTime: inWorldTimeStr,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            type: 'room-move',
            message: `${targetAgent.name} returned to their workstation in ${
              ROOM_MAP[targetAgent.homeRoomId]?.name
            }.`,
            roomId: targetAgent.homeRoomId,
          },
          ...prev,
        ]);
      }
    },
    [agents, inWorldMinutes]
  );

  const handleCompleteTaskNow = useCallback(
    (taskId: string) => {
      const targetTask = tasks.find((t) => t.id === taskId);
      if (!targetTask || targetTask.status === 'Completed') return;

      const agent = agents.find((a) => a.id === targetTask.assignedAgentId);
      const inWorldTimeStr = formatInWorldTime(inWorldMinutes);

      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'Completed' as const,
                progress: 100,
                completionTime: inWorldTimeStr,
              }
            : t
        );
        // Promote next queued task for that agent if none in progress
        const hasActive = next.some(
          (t) =>
            t.assignedAgentId === targetTask.assignedAgentId &&
            t.status === 'In Progress'
        );
        if (!hasActive) {
          const nextQueued = next.find(
            (t) =>
              t.assignedAgentId === targetTask.assignedAgentId &&
              t.status === 'Queued'
          );
          if (nextQueued) {
            nextQueued.status = 'In Progress';
            nextQueued.startTime = inWorldTimeStr;
            nextQueued.progress = 5;
          }
        }
        return next;
      });

      if (agent) {
        const msg = `${agent.name} completed "${targetTask.title}"!`;
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id
              ? {
                  ...a,
                  behavior: 'completing-task',
                  celebrationTimer: 3.5,
                  speechBubble: 'Done!',
                  speechTimer: 3.5,
                }
              : a
          )
        );

        setActivityLog((prev) => [
          {
            id: `evt-manual-done-${Date.now()}`,
            timestamp: 'Just now',
            inWorldTime: inWorldTimeStr,
            agentId: agent.id,
            agentName: agent.name,
            type: 'task-complete',
            message: msg,
            roomId: agent.currentRoomId,
          },
          ...prev,
        ]);

        setNotifications((prev) => [
          {
            id: `notif-manual-${Date.now()}`,
            timestamp: inWorldTimeStr,
            agentId: agent.id,
            agentName: agent.name,
            taskTitle: targetTask.title,
            message: msg,
            read: false,
            dismissed: !settings.notificationsEnabled,
          },
          ...prev,
        ]);

        if (settings.notificationsEnabled) {
          soundEngine.playTaskComplete(settings.notificationSoundsEnabled);
        }
      }
    },
    [tasks, agents, inWorldMinutes, settings.notificationsEnabled, settings.notificationSoundsEnabled]
  );

  const handleChangeTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const inWorldTimeStr = formatInWorldTime(inWorldMinutes);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                startTime:
                  newStatus === 'In Progress' && !t.startTime
                    ? inWorldTimeStr
                    : t.startTime,
              }
            : t
        )
      );
    },
    [inWorldMinutes]
  );

  const handleCreateTask = useCallback(
    (newTaskData: {
      title: string;
      description: string;
      assignedAgentId: string;
      priority: TaskPriority;
      roomId: RoomId;
    }) => {
      const hasInProgress = tasks.some(
        (t) =>
          t.assignedAgentId === newTaskData.assignedAgentId &&
          t.status === 'In Progress'
      );
      const inWorldTimeStr = formatInWorldTime(inWorldMinutes);
      const created: TaskItem = {
        id: `task-custom-${Date.now()}`,
        title: newTaskData.title,
        description: newTaskData.description,
        assignedAgentId: newTaskData.assignedAgentId,
        status: hasInProgress ? 'Queued' : 'In Progress',
        progress: hasInProgress ? 0 : 4,
        estimatedDuration: 22,
        startTime: hasInProgress ? undefined : inWorldTimeStr,
        priority: newTaskData.priority,
        roomId: newTaskData.roomId,
      };
      setTasks((prev) => [created, ...prev]);
    },
    [tasks, inWorldMinutes]
  );

  const handleTriggerMeetingHuddle = useCallback(() => {
    const spots = ROOM_HANGOUT_SPOTS['meeting-room'];
    const participants = agents.slice(0, 3);
    const inWorldTimeStr = formatInWorldTime(inWorldMinutes);

    setAgents((prev) =>
      prev.map((a) => {
        const idx = participants.findIndex((p) => p.id === a.id);
        if (idx === -1) return a;
        const dest = spots[idx % spots.length];
        const path = findWaypointPath(a.position, dest);
        return {
          ...a,
          path,
          targetPosition: dest,
          behavior: path.length > 0 ? 'walking' : 'in-meeting',
          behaviorTimer: 20,
          speechBubble: 'Joining standup!',
          speechTimer: 4,
        };
      })
    );

    setActivityLog((prev) => [
      {
        id: `evt-meeting-${Date.now()}`,
        timestamp: 'Just now',
        inWorldTime: inWorldTimeStr,
        agentId: participants[0].id,
        agentName: participants[0].name,
        type: 'meeting',
        message: 'A quick collaborative standup started around the Oak Meeting Table.',
        roomId: 'meeting-room',
      },
      ...prev,
    ]);
    handleSelectRoom('meeting-room');
  }, [agents, inWorldMinutes, handleSelectRoom]);

  const metrics = calculateProductivityMetrics(agents, tasks);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const activeToastNotifs = notifications
    .filter((n) => !n.dismissed && settings.notificationsEnabled)
    .slice(0, 1);
  const isDark = settings.theme === 'dark';

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'office', label: 'Virtual Office', icon: Building2 },
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#FFF4DF] dark:bg-[#171923] text-[#493A35] dark:text-[#E9EAF2]">
      {/* ==================== TOP APPLICATION HEADER ==================== */}
      <header className="h-14 px-2.5 sm:px-5 border-b border-[#DECBB1] dark:border-[#3B4054] bg-[#F8EBD5] dark:bg-[#222535] flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-30">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle Navigation Drawer"
            className="md:hidden p-1.5 rounded-lg text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#2B3042] shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('office');
            }}
            className="flex items-center gap-2 text-left group min-w-0"
          >
            {/* Pixel-art inspired emblem */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#493A35] dark:bg-[#AFA1F5] flex items-center justify-center border-2 border-[#8B6F5A] dark:border-[#3B4054] shrink-0">
              <span className="font-pixel text-[11px] sm:text-xs font-bold text-[#FFF4DF] dark:text-[#171923]">
                CP
              </span>
            </div>
            <span className="font-pixel text-xs sm:text-base font-bold tracking-tight text-[#493A35] dark:text-[#E9EAF2] truncate">
              Cozy Pixel Office
            </span>
          </button>
        </div>

        {/* Center: Live World Clock, Time-of-Day Cycle, & Key Metrics */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-[#7C6354] dark:text-[#A8ADC2] whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              const order: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
              const nextTod =
                order[(order.indexOf(settings.timeOfDay) + 1) % order.length];
              setSettings((prev) => ({
                ...prev,
                autoDayNight: false,
                timeOfDay: nextTod,
              }));
            }}
            title="Click to cycle Time of Day atmosphere"
            className="px-2.5 py-1 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2] font-semibold flex items-center gap-2 hover:border-[#8B6F5A]"
          >
            <Clock className="w-3.5 h-3.5 text-[#8B6F5A] dark:text-[#AFA1F5]" />
            <span className="font-mono-num">{formatInWorldTime(inWorldMinutes)}</span>
            <span aria-hidden="true">·</span>
            <span>{settings.timeOfDay}</span>
          </button>

          <span>
            Active Agents:{' '}
            <strong className="font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
              {metrics.workingCount}/{metrics.totalAgents}
            </strong>
          </span>

          <span aria-hidden="true">·</span>

          <span>
            Completed Tasks:{' '}
            <strong className="font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
              {metrics.completedTasks}
            </strong>
          </span>
        </div>

        {/* Right: Utility Controls (Notifications, Audio, Theme Toggle, Settings) */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {/* Audio Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setAudioPanelOpen((v) => !v);
                setNotifPanelOpen(false);
              }}
              aria-label="Ambient Music and Sound Controls"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                settings.musicEnabled
                  ? 'bg-[#B8D0B0]/40 dark:bg-[#A7D8BE]/25 border-[#8B6F5A] dark:border-[#A7D8BE] text-[#493A35] dark:text-[#A7D8BE]'
                  : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {settings.musicEnabled ? 'Music On' : 'Music'}
              </span>
            </button>

            {audioPanelOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl bg-[#FFF4DF] dark:bg-[#222535] border-2 border-[#8B6F5A] dark:border-[#3B4054] shadow-xl p-4 z-50 space-y-3"
                role="dialog"
                aria-label="Audio Settings Popover"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Lo-Fi Office Audio
                  </span>
                  <button
                    type="button"
                    onClick={() => setAudioPanelOpen(false)}
                    aria-label="Close Audio Panel"
                    className="p-1 text-[#7C6354] dark:text-[#A8ADC2]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({ ...s, musicEnabled: !s.musicEnabled }))
                  }
                  className="w-full py-2 px-3 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-bold"
                >
                  {settings.musicEnabled
                    ? 'Pause Ambient Soundtrack'
                    : 'Play Ambient Soundtrack'}
                </button>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Music Volume</span>
                    <span className="font-mono-num">
                      {Math.round(settings.musicVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Header Music Volume"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.musicVolume}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        musicVolume: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[#493A35] dark:accent-[#AFA1F5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      'Cozy Café',
                      'Rainy Afternoon',
                      'Quiet Office',
                      'Peaceful Night',
                    ] as const
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          ambientMode: m,
                          musicEnabled: true,
                        }))
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border ${
                        settings.ambientMode === m
                          ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923]'
                          : 'bg-[#F8EBD5] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#DECBB1] dark:border-[#3B4054] text-xs">
                  <span>Sound Effects</span>
                  <input
                    type="checkbox"
                    aria-label="Toggle Sound Effects"
                    checked={settings.soundEffectsEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        soundEffectsEnabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#493A35]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notification Center Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setNotifPanelOpen((v) => !v);
                setAudioPanelOpen(false);
              }}
              aria-label="Open Notification Center"
              className="relative p-2 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054]"
            >
              {settings.notificationsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4 text-[#7C6354] dark:text-[#A8ADC2]" />
              )}
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#D96B43] text-white text-[10px] font-mono-num font-bold">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {notifPanelOpen && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#FFF4DF] dark:bg-[#222535] border-2 border-[#8B6F5A] dark:border-[#3B4054] shadow-xl p-4 z-50 space-y-3"
                role="dialog"
                aria-label="Notification Center"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#DECBB1] dark:border-[#3B4054]">
                  <div>
                    <h3 className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                      Notification Center
                    </h3>
                    <p className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                      Task completions & milestone alerts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          notificationsEnabled: !s.notificationsEnabled,
                        }))
                      }
                      className="px-2 py-1 rounded-md bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-[11px] font-semibold"
                    >
                      {settings.notificationsEnabled ? 'Alerts: ON' : 'Alerts: OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifPanelOpen(false)}
                      aria-label="Close Notification Center"
                      className="p-1 text-[#7C6354] dark:text-[#A8ADC2]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, read: true }))
                      )
                    }
                    className="text-[#8B6F5A] dark:text-[#AFA1F5] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    className="text-[#7C6354] dark:text-[#A8ADC2] hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const ag = agents.find((a) => a.id === n.agentId);
                      return (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                            n.read
                              ? 'bg-[#F8EBD5]/60 dark:bg-[#2B3042]/60 border-[#DECBB1] dark:border-[#3B4054]'
                              : 'bg-[#F8EBD5] dark:bg-[#2B3042] border-[#8B6F5A] dark:border-[#AFA1F5]'
                          }`}
                        >
                          {ag && (
                            <CharacterPortrait
                              agent={ag}
                              size={32}
                              isDark={isDark}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                              {n.message}
                            </div>
                            <div className="text-[10px] font-mono-num text-[#7C6354] dark:text-[#A8ADC2] mt-0.5">
                              {n.timestamp}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setNotifications((prev) =>
                                prev.filter((item) => item.id !== n.id)
                              )
                            }
                            aria-label={`Dismiss notification ${n.taskTitle}`}
                            className="p-1 text-[#7C6354] dark:text-[#A8ADC2] hover:text-[#493A35]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Light / Dark Mode Complete Transformation Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSettings((prev) => ({
                ...prev,
                theme: prev.theme === 'dark' ? 'light' : 'dark',
                timeOfDay: prev.theme === 'dark' ? 'Morning' : 'Night',
              }));
            }}
            aria-label={
              isDark ? 'Switch to Light Mode' : 'Switch to Nighttime Dark Mode'
            }
            className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#E9B49B]" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#493A35]" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Settings Quick Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab((prev) => (prev === 'settings' ? 'office' : 'settings'));
            }}
            aria-label="Open Simulation Settings"
            className={`p-2 rounded-lg border transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923]'
                : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================== MAIN BODY (SIDEBAR + WORKSPACE + INSPECTOR) ==================== */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Navigation & Agent Roster Sidebar (Desktop + Slide-over on Mobile) */}
        <aside
          aria-label="Primary Navigation and Agent Roster"
          className={`${
            mobileMenuOpen
              ? 'fixed inset-y-14 left-0 z-40 w-68 flex'
              : 'hidden md:flex'
          } ${
            leftSidebarCollapsed ? 'md:w-16' : 'md:w-64 lg:w-68'
          } flex-col border-r border-[#DECBB1] dark:border-[#3B4054] bg-[#F8EBD5] dark:bg-[#222535] shrink-0 transition-all duration-150`}
        >
          {/* Navigation Links */}
          <div className="p-2.5 space-y-1 border-b border-[#DECBB1] dark:border-[#3B4054]">
            <div className="flex items-center justify-between px-2 py-1">
              {!leftSidebarCollapsed && (
                <span className="text-[11px] font-bold text-[#7C6354] dark:text-[#A8ADC2]">
                  Workspace Views
                </span>
              )}
              <button
                type="button"
                onClick={() => setLeftSidebarCollapsed((v) => !v)}
                aria-label={
                  leftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'
                }
                className="hidden md:inline-flex p-1 rounded-lg text-[#7C6354] dark:text-[#A8ADC2] hover:bg-[#EFE0C6] dark:hover:bg-[#2B3042]"
              >
                {leftSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            <nav className="space-y-1" aria-label="Main Views">
              {navItems.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveTab(id);
                      setMobileMenuOpen(false);
                    }}
                    title={label}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923]'
                        : 'text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#2B3042]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!leftSidebarCollapsed && <span>{label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Miniature Agent Roster */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {!leftSidebarCollapsed && (
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-[#7C6354] dark:text-[#A8ADC2]">
                <span>Agent Roster ({agents.length})</span>
                <span className="font-mono-num">{metrics.workingCount} active</span>
              </div>
            )}

            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              const currentTask = tasks.find(
                (t) =>
                  t.assignedAgentId === agent.id && t.status === 'In Progress'
              );

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playSelectCharacter();
                    setSelectedAgentId(agent.id);
                    setRightInspectorCollapsed(false);
                    setMobileMenuOpen(false);
                  }}
                  title={`${agent.name} — ${agent.role}`}
                  className={`w-full text-left p-2 rounded-xl border transition-colors flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#493A35] dark:border-[#AFA1F5] shadow-xs'
                      : 'bg-[#FFF4DF]/60 dark:bg-[#2B3042]/50 border-[#DECBB1] dark:border-[#3B4054] hover:bg-[#FFF4DF] dark:hover:bg-[#2B3042]'
                  }`}
                >
                  <CharacterPortrait
                    agent={agent}
                    size={leftSidebarCollapsed ? 32 : 36}
                    isDark={isDark}
                  />

                  {!leftSidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] truncate">
                          {agent.name}
                        </span>
                        <span className="text-[10px] font-medium text-[#7C6354] dark:text-[#A8ADC2] shrink-0">
                          {agent.behavior === 'working'
                            ? 'Working'
                            : agent.behavior === 'walking'
                            ? 'Moving'
                            : agent.behavior === 'taking-break'
                            ? 'Break'
                            : 'Active'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2] truncate">
                        {currentTask ? currentTask.title : agent.role}
                      </div>
                      {currentTask && (
                        <div className="mt-1 w-full h-1 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
                          <div
                            className="h-full bg-[#8B6F5A] dark:bg-[#A7D8BE]"
                            style={{ width: `${currentTask.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Central Content Area: Virtual Office Canvas OR Productivity Dashboard View */}
        <main className="flex-1 flex min-w-0 h-full relative overflow-hidden">
          {activeTab === 'office' ? (
            <OfficeViewport
              agents={agents}
              tasks={tasks}
              selectedAgentId={selectedAgentId}
              selectedRoomId={selectedRoomId}
              camera={camera}
              settings={settings}
              onCameraChange={setCamera}
              onSelectAgent={(id) => {
                setSelectedAgentId(id);
                if (id) setRightInspectorCollapsed(false);
              }}
              onSelectRoom={handleSelectRoom}
              onResetCamera={handleResetCamera}
              onToggleSimulation={() =>
                setSettings((s) => ({
                  ...s,
                  simulationRunning: !s.simulationRunning,
                }))
              }
              onChangeSpeed={(spd) =>
                setSettings((s) => ({ ...s, simulationSpeed: spd }))
              }
              onTriggerBreakRoomCoffee={() => {
                const candidate =
                  agents.find((a) => a.behavior !== 'taking-break') || agents[0];
                if (candidate) handleSendAgentToBreak(candidate.id);
              }}
              onTriggerMeetingHuddle={handleTriggerMeetingHuddle}
              onOpenTaskBoard={() => setActiveTab('tasks')}
              onToggleMute={() =>
                setSettings((s) => ({ ...s, isMuted: !s.isMuted }))
              }
              onToggleMusic={() =>
                setSettings((s) => ({ ...s, musicEnabled: !s.musicEnabled }))
              }
            />
          ) : (
            <ProductivityDashboard
              activeTab={activeTab}
              agents={agents}
              tasks={tasks}
              activityLog={activityLog}
              metrics={metrics}
              settings={settings}
              preselectedAgentFilter={preselectedAgentFilter}
              onClearPreselectedAgentFilter={() => setPreselectedAgentFilter('')}
              onReturnToOffice={() => setActiveTab('office')}
              onLocateAgentInOffice={handleFocusAgent}
              onCompleteTaskNow={handleCompleteTaskNow}
              onChangeTaskStatus={handleChangeTaskStatus}
              onCreateTask={handleCreateTask}
              onSendAgentToBreak={handleSendAgentToBreak}
              onReturnAgentToWork={handleReturnAgentToWork}
              onClearActivityLog={() => setActivityLog([])}
              onClearNotifications={() => setNotifications([])}
              onUpdateSettings={setSettings}
            />
          )}
        </main>

        {/* Right Contextual Inspector (Desktop Sidebar + Mobile Bottom Sheet when Agent Selected) */}
        <div className="hidden md:flex h-full">
          <AgentInspector
            selectedAgent={selectedAgent}
            tasks={tasks}
            recentEvents={activityLog}
            metrics={metrics}
            followingAgentId={camera.followingAgentId}
            isCollapsed={rightInspectorCollapsed}
            isDark={isDark}
            timeOfDay={settings.timeOfDay}
            onToggleCollapse={() => setRightInspectorCollapsed((v) => !v)}
            onDismissAgent={() => setSelectedAgentId(null)}
            onFocusAgent={handleFocusAgent}
            onToggleFollowAgent={handleToggleFollowAgent}
            onSendAgentToBreak={handleSendAgentToBreak}
            onReturnAgentToWork={handleReturnAgentToWork}
            onCompleteTaskNow={handleCompleteTaskNow}
            onViewAgentTasks={(agentId) => {
              setPreselectedAgentFilter(agentId);
              setActiveTab('tasks');
            }}
            onAddQuickTask={(agentId, title, roomId) =>
              handleCreateTask({
                title,
                description: 'Assigned directly from the Agent Inspector.',
                assignedAgentId: agentId,
                priority: 'Medium',
                roomId,
              })
            }
            onChangeTimeOfDay={(tod) =>
              setSettings((s) => ({ ...s, autoDayNight: false, timeOfDay: tod }))
            }
            onSelectAgentById={(id) => setSelectedAgentId(id)}
          />
        </div>

        {/* Mobile Bottom Sheet Inspector when an agent is selected on narrow screens */}
        {selectedAgent && (
          <div className="md:hidden fixed inset-x-0 bottom-0 z-40 max-h-[68vh] rounded-t-2xl border-t-2 border-[#8B6F5A] dark:border-[#3B4054] bg-[#F8EBD5] dark:bg-[#222535] shadow-2xl overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <CharacterPortrait
                  agent={selectedAgent}
                  size={40}
                  isDark={isDark}
                />
                <div>
                  <h3 className="text-sm font-bold">{selectedAgent.name}</h3>
                  <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                    {selectedAgent.role} ·{' '}
                    {ROOM_MAP[selectedAgent.currentRoomId]?.shortName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                aria-label="Close Mobile Agent Sheet"
                className="p-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFocusAgent(selectedAgent)}
                className="py-2 px-3 rounded-xl bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold"
              >
                Focus Camera
              </button>
              <button
                type="button"
                onClick={() => handleSendAgentToBreak(selectedAgent.id)}
                className="py-2 px-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold"
              >
                Coffee Break
              </button>
            </div>
          </div>
        )}

        {/* Task Completion Toast Notifications (Top-Right below header) */}
        {activeToastNotifs.length > 0 && (
          <div
            className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-xs sm:max-w-sm pointer-events-auto"
            role="status"
            aria-live="polite"
          >
            {activeToastNotifs.map((toast) => {
              const toastAgent = agents.find((a) => a.id === toast.agentId);
              return (
                <div
                  key={toast.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#222535] border-2 border-[#8B6F5A] dark:border-[#AFA1F5] shadow-lg flex items-center gap-2.5"
                >
                  {toastAgent && (
                    <CharacterPortrait
                      agent={toastAgent}
                      size={36}
                      isDark={isDark}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                      Task Completed!
                    </div>
                    <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2] truncate">
                      {toast.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.id === toast.id ? { ...n, dismissed: true } : n
                        )
                      )
                    }
                    aria-label="Dismiss Notification Toast"
                    className="p-1 text-[#7C6354] dark:text-[#A8ADC2]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
