import React, { useState } from 'react';
import {
  ActiveTab,
  AgentCharacter,
  TaskItem,
  ActivityEvent,
  ProductivityMetrics,
  AppSettings,
  RoomId,
  TaskPriority,
  TaskStatus,
  TimeOfDay,
  AmbientMode,
} from '../types/office';
import { ROOMS, ROOM_MAP } from '../data/officeData';
import { filterTasks } from '../utils/simulationLogic';
import { CharacterPortrait } from './CharacterPortrait';
import { soundEngine } from '../utils/soundEngine';
import {
  Users,
  Briefcase,
  Coffee,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Play,
  Pause,
  ArrowUpRight,
  Compass,
  Volume2,
  Bell,
  Sun,
  Moon,
  Sliders,
} from 'lucide-react';

interface ProductivityDashboardProps {
  activeTab: Exclude<ActiveTab, 'office'>;
  agents: AgentCharacter[];
  tasks: TaskItem[];
  activityLog: ActivityEvent[];
  metrics: ProductivityMetrics;
  settings: AppSettings;
  preselectedAgentFilter: string;
  onClearPreselectedAgentFilter: () => void;
  onReturnToOffice: () => void;
  onLocateAgentInOffice: (agent: AgentCharacter) => void;
  onCompleteTaskNow: (taskId: string) => void;
  onChangeTaskStatus: (taskId: string, status: TaskStatus) => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    assignedAgentId: string;
    priority: TaskPriority;
    roomId: RoomId;
  }) => void;
  onSendAgentToBreak: (agentId: string) => void;
  onReturnAgentToWork: (agentId: string) => void;
  onClearActivityLog: () => void;
  onClearNotifications: () => void;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  activeTab,
  agents,
  tasks,
  activityLog,
  metrics,
  settings,
  preselectedAgentFilter,
  onClearPreselectedAgentFilter,
  onReturnToOffice,
  onLocateAgentInOffice,
  onCompleteTaskNow,
  onChangeTaskStatus,
  onCreateTask,
  onSendAgentToBreak,
  onReturnAgentToWork,
  onClearActivityLog,
  onClearNotifications,
  onUpdateSettings,
}) => {
  const isDark = settings.theme === 'dark';

  // Task Board Filter States
  const [agentFilter, setAgentFilter] = useState<string>(
    preselectedAgentFilter || 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAgentId, setNewAgentId] = useState(agents[0]?.id || 'agent-mochi');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newRoomId, setNewRoomId] = useState<RoomId>('main-workspace');

  // Sync external agent filter when jumping from Inspector "View Tasks"
  React.useEffect(() => {
    if (preselectedAgentFilter) {
      setAgentFilter(preselectedAgentFilter);
      onClearPreselectedAgentFilter();
    }
  }, [preselectedAgentFilter, onClearPreselectedAgentFilter]);

  const filteredTasks = filterTasks(tasks, {
    agentId: agentFilter,
    status: statusFilter,
    roomId: roomFilter,
    priority: priorityFilter,
    search: searchQuery,
  });

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    soundEngine.playClick();
    onCreateTask({
      title: newTitle.trim(),
      description:
        newDesc.trim() ||
        'Simulated deliverable queued from the Cozy Pixel Office Task Board.',
      assignedAgentId: newAgentId,
      priority: newPriority,
      roomId: newRoomId,
    });
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#FFF4DF] dark:bg-[#171923] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Banner with Quick Return to Virtual Office */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DECBB1] dark:border-[#3B4054]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#493A35] dark:text-[#E9EAF2]">
              {activeTab === 'overview' && 'Productivity Overview'}
              {activeTab === 'agents' && 'Office Agent Directory'}
              {activeTab === 'tasks' && 'Interactive Task Board'}
              {activeTab === 'activity' && 'Live Office Activity Log'}
              {activeTab === 'settings' && 'Simulation & World Settings'}
            </h1>
            <p className="text-xs sm:text-sm text-[#7C6354] dark:text-[#A8ADC2]">
              {activeTab === 'overview' &&
                'Real-time metrics, room throughput, and simulated agent states across all six rooms.'}
              {activeTab === 'agents' &&
                'Meet the 10 pixel-art specialists working inside Cozy Pixel Office.'}
              {activeTab === 'tasks' &&
                'Filter, inspect, queue, or complete simulated agent tasks in real time.'}
              {activeTab === 'activity' &&
                'Chronological stream of task milestones, room movements, and coffee breaks.'}
              {activeTab === 'settings' &&
                'Customize simulation speed, day/night lighting, lo-fi audio, and accessibility.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onReturnToOffice();
            }}
            className="px-4 py-2 rounded-xl bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4" />
            <span>Return to Office World</span>
          </button>
        </div>

        {/* ==================== 1. OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 6 Overview Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <div className="flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>Total Agents</span>
                  <Users className="w-4 h-4 text-[#8B6F5A] dark:text-[#AFA1F5]" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                  {metrics.totalAgents}
                </div>
                <div className="mt-1 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                  Across 6 rooms
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <div className="flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>Working</span>
                  <Briefcase className="w-4 h-4 text-[#5F9E71] dark:text-[#A7D8BE]" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                  {metrics.workingCount}
                </div>
                <div className="mt-1 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                  At desks or huddles
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <div className="flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>Idle / Break</span>
                  <Coffee className="w-4 h-4 text-[#D97B59] dark:text-[#E9B49B]" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                  {metrics.idleOrBreakCount}
                </div>
                <div className="mt-1 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                  Recharging or walking
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <div className="flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>In Progress</span>
                  <Clock className="w-4 h-4 text-[#6A8EAE] dark:text-[#8EBCE0]" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                  {metrics.inProgressTasks}
                </div>
                <div className="mt-1 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                  {metrics.queuedTasks} queued next
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <div className="flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>Completed</span>
                  <CheckCircle2 className="w-4 h-4 text-[#5F9E71] dark:text-[#A7D8BE]" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                  {metrics.completedTasks}
                </div>
                <div className="mt-1 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                  Deliverables shipped
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <div className="flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>Completion</span>
                  <Sparkles className="w-4 h-4 text-[#D69E2E] dark:text-[#E9B49B]" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                  {metrics.completionPercentage}%
                </div>
                <div className="mt-1 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                  {metrics.officeMood}
                </div>
              </div>
            </div>

            {/* Productivity Visualization: Room Task Distribution & Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 1: Task Progress by Office Room */}
              <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
                <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1">
                  Task Activity by Room
                </h2>
                <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2] mb-4">
                  Average completion progress of tasks assigned to each office room
                </p>
                <div className="space-y-3">
                  {ROOMS.map((room) => {
                    const roomTasks = tasks.filter((t) => t.roomId === room.id);
                    const avg =
                      roomTasks.length > 0
                        ? Math.round(
                            roomTasks.reduce(
                              (s, t) =>
                                s + (t.status === 'Completed' ? 100 : t.progress),
                              0
                            ) / roomTasks.length
                          )
                        : 0;
                    const agentsHere = agents.filter(
                      (a) => a.currentRoomId === room.id
                    ).length;

                    return (
                      <div key={room.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                            {room.name}{' '}
                            <span className="font-normal text-[#7C6354] dark:text-[#A8ADC2]">
                              · {agentsHere} agent{agentsHere === 1 ? '' : 's'} present
                            </span>
                          </span>
                          <span className="font-mono-num font-bold text-[#493A35] dark:text-[#E9EAF2]">
                            {avg}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${avg}%`,
                              backgroundColor: room.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Task Status Distribution & Queue Health */}
              <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1">
                    Task Pipeline Distribution
                  </h2>
                  <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2] mb-4">
                    Live breakdown of all {tasks.length} simulated tasks across the studio
                  </p>

                  {/* Stacked Horizontal Bar */}
                  <div className="w-full h-6 rounded-xl bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden flex border border-[#DECBB1] dark:border-[#3B4054] mb-4">
                    <div
                      style={{
                        width: `${(metrics.completedTasks / Math.max(1, tasks.length)) * 100}%`,
                      }}
                      className="h-full bg-[#B8D0B0] dark:bg-[#A7D8BE] transition-all duration-300"
                      title={`Completed: ${metrics.completedTasks}`}
                    />
                    <div
                      style={{
                        width: `${(metrics.inProgressTasks / Math.max(1, tasks.length)) * 100}%`,
                      }}
                      className="h-full bg-[#F5B99B] dark:bg-[#E9B49B] transition-all duration-300"
                      title={`In Progress: ${metrics.inProgressTasks}`}
                    />
                    <div
                      style={{
                        width: `${(metrics.queuedTasks / Math.max(1, tasks.length)) * 100}%`,
                      }}
                      className="h-full bg-[#B9D9ED] dark:bg-[#8EBCE0] transition-all duration-300"
                      title={`Queued: ${metrics.queuedTasks}`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
                      <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                        Completed
                      </div>
                      <div className="mt-1 text-lg font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                        {metrics.completedTasks}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
                      <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                        In Progress
                      </div>
                      <div className="mt-1 text-lg font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                        {metrics.inProgressTasks}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
                      <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                        Queued
                      </div>
                      <div className="mt-1 text-lg font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                        {metrics.queuedTasks}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#DECBB1] dark:border-[#3B4054] flex items-center justify-between text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  <span>Simulation Speed: {settings.simulationSpeed}x</span>
                  <span>Time of Day: {settings.timeOfDay}</span>
                </div>
              </div>
            </div>

            {/* Live Agent Roster Grid */}
            <div>
              <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2] mb-3">
                Active Office Companions (Click to Focus in World)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map((agent) => {
                  const activeTask = tasks.find(
                    (t) =>
                      t.assignedAgentId === agent.id &&
                      t.status === 'In Progress'
                  );
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelectCharacter();
                        onLocateAgentInOffice(agent);
                      }}
                      className="text-left p-3.5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] hover:border-[#8B6F5A] dark:hover:border-[#AFA1F5] transition-colors flex items-start gap-3"
                    >
                      <CharacterPortrait
                        agent={agent}
                        size={44}
                        isDark={isDark}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2] truncate">
                            {agent.name}
                          </span>
                          <span className="text-[11px] font-medium text-[#8B6F5A] dark:text-[#AFA1F5] shrink-0">
                            {ROOM_MAP[agent.currentRoomId]?.shortName}
                          </span>
                        </div>
                        <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                          {agent.role}
                        </div>
                        {activeTask && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] text-[#493A35] dark:text-[#E9EAF2] mb-1">
                              <span className="truncate">{activeTask.title}</span>
                              <span className="font-mono-num font-bold ml-1">
                                {Math.round(activeTask.progress)}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
                              <div
                                className="h-full bg-[#8B6F5A] dark:bg-[#A7D8BE]"
                                style={{ width: `${activeTask.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. AGENTS TAB ==================== */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const agentTasks = tasks.filter(
                (t) => t.assignedAgentId === agent.id
              );
              const currentTask = agentTasks.find(
                (t) => t.status === 'In Progress'
              );
              const doneCount = agentTasks.filter(
                (t) => t.status === 'Completed'
              ).length;

              return (
                <div
                  key={agent.id}
                  className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    <CharacterPortrait
                      agent={agent}
                      size={56}
                      isDark={isDark}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-[#493A35] dark:text-[#E9EAF2]">
                          {agent.name}
                        </h3>
                        <span className="text-xs font-medium text-[#7C6354] dark:text-[#A8ADC2]">
                          {ROOM_MAP[agent.currentRoomId]?.name}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#8B6F5A] dark:text-[#E9B49B]">
                        {agent.role} · {agent.accessory}
                      </div>
                      <p className="mt-1 text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-relaxed">
                        {agent.personality}
                      </p>
                    </div>
                  </div>

                  {currentTask && (
                    <div className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#493A35] dark:text-[#E9EAF2] truncate">
                          {currentTask.title}
                        </span>
                        <span className="font-mono-num font-bold text-[#493A35] dark:text-[#A7D8BE]">
                          {Math.round(currentTask.progress)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
                        <div
                          className="h-full bg-[#8B6F5A] dark:bg-[#A7D8BE]"
                          style={{ width: `${currentTask.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                      {doneCount} completed · State: {agent.behavior}
                    </span>
                    <div className="flex items-center gap-2">
                      {agent.behavior !== 'taking-break' ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onSendAgentToBreak(agent.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6]"
                        >
                          Coffee Break
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onReturnAgentToWork(agent.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2]"
                        >
                          Return to Desk
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playSelectCharacter();
                          onLocateAgentInOffice(agent);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold flex items-center gap-1"
                      >
                        <span>Focus in Office</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================== 3. TASKS TAB (INTERACTIVE TASK BOARD) ==================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-5">
            {/* Create New Task Bar */}
            <form
              onSubmit={handleAddNewTask}
              className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
            >
              <div className="md:col-span-3">
                <label
                  htmlFor="new-task-title"
                  className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1"
                >
                  New Task Title
                </label>
                <input
                  id="new-task-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Audit nighttime window stars..."
                  className="w-full px-3 py-2 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
                />
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="new-task-agent"
                  className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1"
                >
                  Assign Agent
                </label>
                <select
                  id="new-task-agent"
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="new-task-room"
                  className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1"
                >
                  Room
                </label>
                <select
                  id="new-task-room"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value as RoomId)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
                >
                  {ROOMS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="new-task-priority"
                  className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1"
                >
                  Priority
                </label>
                <select
                  id="new-task-priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
              </div>
            </form>

            {/* Filter Bar */}
            <div className="p-3.5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[#7C6354] dark:text-[#A8ADC2] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks by title or description..."
                  aria-label="Search Tasks"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
                />
              </div>

              <select
                aria-label="Filter by Character"
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
              >
                <option value="ALL">All Characters</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Queued">Queued</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Paused">Paused</option>
              </select>

              <select
                aria-label="Filter by Room"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
              >
                <option value="ALL">All Rooms</option>
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2]"
              >
                <option value="ALL">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            {/* 3-Column Kanban Task Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(['Queued', 'In Progress', 'Completed'] as const).map((colStatus) => {
                const colTasks = filteredTasks.filter((t) =>
                  colStatus === 'In Progress'
                    ? t.status === 'In Progress' || t.status === 'Paused'
                    : t.status === colStatus
                );

                return (
                  <div
                    key={colStatus}
                    className="p-4 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#DECBB1] dark:border-[#3B4054]">
                      <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                        {colStatus}
                      </h2>
                      <span className="text-xs font-mono-num font-bold text-[#7C6354] dark:text-[#A8ADC2]">
                        {colTasks.length}
                      </span>
                    </div>

                    {colTasks.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                        No tasks matching filters in {colStatus}.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {colTasks.map((task) => {
                          const assigned = agents.find(
                            (a) => a.id === task.assignedAgentId
                          );
                          return (
                            <div
                              key={task.id}
                              className="p-3.5 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                                  {task.title}
                                </h3>
                                <span className="text-[11px] font-medium text-[#7C6354] dark:text-[#A8ADC2] shrink-0">
                                  {task.priority}
                                </span>
                              </div>

                              <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-relaxed">
                                {task.description}
                              </p>

                              {assigned && (
                                <div className="flex items-center justify-between text-xs pt-1">
                                  <button
                                    type="button"
                                    onClick={() => onLocateAgentInOffice(assigned)}
                                    className="flex items-center gap-2 hover:underline text-[#493A35] dark:text-[#E9EAF2] font-semibold"
                                  >
                                    <CharacterPortrait
                                      agent={assigned}
                                      size={24}
                                      isDark={isDark}
                                    />
                                    <span>{assigned.name}</span>
                                  </button>
                                  <span className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                                    {ROOM_MAP[task.roomId]?.shortName}
                                  </span>
                                </div>
                              )}

                              {/* Progress Bar & Action Controls */}
                              <div>
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="text-[#7C6354] dark:text-[#A8ADC2]">
                                    {task.status}
                                  </span>
                                  <span className="font-mono-num font-bold text-[#493A35] dark:text-[#E9EAF2]">
                                    {Math.round(task.progress)}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
                                  <div
                                    className="h-full bg-[#8B6F5A] dark:bg-[#A7D8BE]"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>

                              {task.status !== 'Completed' && (
                                <div className="flex items-center gap-1.5 pt-1">
                                  {task.status === 'Queued' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick();
                                        onChangeTaskStatus(task.id, 'In Progress');
                                      }}
                                      className="flex-1 py-1 px-2 rounded-lg bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] text-[11px] font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6]"
                                    >
                                      Start Now
                                    </button>
                                  )}
                                  {task.status === 'In Progress' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick();
                                        onChangeTaskStatus(task.id, 'Paused');
                                      }}
                                      className="py-1 px-2 rounded-lg bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] text-[11px] font-semibold text-[#493A35] dark:text-[#E9EAF2]"
                                    >
                                      Pause
                                    </button>
                                  )}
                                  {task.status === 'Paused' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick();
                                        onChangeTaskStatus(task.id, 'In Progress');
                                      }}
                                      className="py-1 px-2 rounded-lg bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] text-[11px] font-semibold text-[#493A35] dark:text-[#E9EAF2]"
                                    >
                                      Resume
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      onCompleteTaskNow(task.id);
                                    }}
                                    className="flex-1 py-1 px-2 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-[11px] font-semibold"
                                  >
                                    Complete
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== 4. ACTIVITY LOG TAB ==================== */}
        {activeTab === 'activity' && (
          <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                  Chronological Simulation Feed ({activityLog.length})
                </h2>
                <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  Every entry is generated directly by live character and task events
                </p>
              </div>
              {activityLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClearActivityLog();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] flex items-center gap-1.5 hover:bg-[#EFE0C6]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Log</span>
                </button>
              )}
            </div>

            {activityLog.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <p className="text-sm font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                  No activity events recorded yet.
                </p>
                <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                  Keep the simulation running and new task starts, milestones, and completions will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activityLog.map((evt) => {
                  const agent = agents.find((a) => a.id === evt.agentId);
                  return (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {agent && (
                          <CharacterPortrait
                            agent={agent}
                            size={36}
                            isDark={isDark}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                            {evt.message}
                          </div>
                          <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                            {evt.agentName} · {ROOM_MAP[evt.roomId]?.name} ·{' '}
                            <span className="font-mono-num">{evt.inWorldTime}</span>
                          </div>
                        </div>
                      </div>

                      {agent && (
                        <button
                          type="button"
                          onClick={() => onLocateAgentInOffice(agent)}
                          className="px-2.5 py-1 rounded-lg bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] shrink-0"
                        >
                          View Agent
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. SETTINGS TAB ==================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Simulation Controls */}
            <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#DECBB1] dark:border-[#3B4054]">
                <Sliders className="w-4 h-4 text-[#8B6F5A] dark:text-[#AFA1F5]" />
                <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                  Simulation & Day/Night Cycle
                </h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Simulation Status
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Pause or resume autonomous agent movement and task progress
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((s) => ({
                      ...s,
                      simulationRunning: !s.simulationRunning,
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold flex items-center gap-1.5"
                >
                  {settings.simulationRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Running</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Paused</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1.5">
                  Simulation Speed ({settings.simulationSpeed}x)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((s) => ({ ...s, simulationSpeed: spd }))
                      }
                      className={`py-1.5 rounded-lg text-xs font-mono-num font-bold border ${
                        settings.simulationSpeed === spd
                          ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923]'
                          : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Automatic Day/Night Progression
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Sync environment lighting with in-world clock
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Automatic Day/Night Progression"
                  checked={settings.autoDayNight}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      autoDayNight: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1.5">
                  Manual Time of Day Preview
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Morning', 'Afternoon', 'Evening', 'Night'] as TimeOfDay[]).map(
                    (tod) => (
                      <button
                        key={tod}
                        type="button"
                        onClick={() =>
                          onUpdateSettings((s) => ({
                            ...s,
                            autoDayNight: false,
                            timeOfDay: tod,
                          }))
                        }
                        className={`py-1.5 rounded-lg text-xs font-semibold border ${
                          settings.timeOfDay === tod
                            ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923]'
                            : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
                        }`}
                      >
                        {tod}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1.5">
                  Character Movement Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Calm', 'Balanced', 'Lively'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((s) => ({
                          ...s,
                          movementFrequency: freq,
                        }))
                      }
                      className={`py-1.5 rounded-lg text-xs font-semibold border ${
                        settings.movementFrequency === freq
                          ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923]'
                          : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Appearance & Theme */}
            <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#DECBB1] dark:border-[#3B4054]">
                {isDark ? (
                  <Moon className="w-4 h-4 text-[#AFA1F5]" />
                ) : (
                  <Sun className="w-4 h-4 text-[#D96B43]" />
                )}
                <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                  Appearance & Nighttime Transformation
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1.5">
                  Application & World Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((s) => ({ ...s, theme: 'light' }))
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 ${
                      settings.theme === 'light'
                        ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35]'
                        : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Daylight Cozy Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((s) => ({ ...s, theme: 'dark' }))
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 ${
                      settings.theme === 'dark'
                        ? 'bg-[#AFA1F5] text-[#171923] border-[#AFA1F5]'
                        : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Nighttime Dark Mode</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor="ambient-lighting-slider"
                    className="font-bold text-[#493A35] dark:text-[#E9EAF2]"
                  >
                    Ambient Lighting & Lamp Halo Intensity
                  </label>
                  <span className="font-mono-num">
                    {Math.round(settings.ambientLightingIntensity * 100)}%
                  </span>
                </div>
                <input
                  id="ambient-lighting-slider"
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={settings.ambientLightingIntensity}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      ambientLightingIntensity: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#493A35] dark:accent-[#AFA1F5]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Show Office Mini-Map
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Display floor plan overlay in the bottom-left corner
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Show Office Mini-Map"
                  checked={settings.showMiniMap}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      showMiniMap: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Reduce Motion
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Minimize bobbing, particles, and camera interpolation
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Reduce Motion"
                  checked={settings.reduceMotion}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      reduceMotion: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>
            </div>

            {/* Ambient Audio & Sound Effects */}
            <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#DECBB1] dark:border-[#3B4054]">
                <Volume2 className="w-4 h-4 text-[#8B6F5A] dark:text-[#AFA1F5]" />
                <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                  Ambient Soundtrack & Sound Effects
                </h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Background Lo-Fi Ambience
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Synthesized relaxing chord progressions and room texture
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Enable Background Music"
                  checked={settings.musicEnabled}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      musicEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1.5">
                  Ambient Soundscape Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Cozy Café',
                      'Rainy Afternoon',
                      'Quiet Office',
                      'Peaceful Night',
                    ] as AmbientMode[]
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((s) => ({ ...s, ambientMode: mode }))
                      }
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border ${
                        settings.ambientMode === mode
                          ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923]'
                          : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor="music-vol-slider"
                    className="font-bold text-[#493A35] dark:text-[#E9EAF2]"
                  >
                    Music Volume
                  </label>
                  <span className="font-mono-num">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  id="music-vol-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.musicVolume}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      musicVolume: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#493A35] dark:accent-[#AFA1F5]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    UI & Interaction Sound Effects
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Soft chimes for clicks, character selection, and room transitions
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Enable Sound Effects"
                  checked={settings.soundEffectsEnabled}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      soundEffectsEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>
            </div>

            {/* Notifications & Camera Settings */}
            <div className="p-5 rounded-xl bg-[#F8EBD5] dark:bg-[#222535] border border-[#DECBB1] dark:border-[#3B4054] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#DECBB1] dark:border-[#3B4054]">
                <Bell className="w-4 h-4 text-[#8B6F5A] dark:text-[#AFA1F5]" />
                <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                  Notifications & Camera Preferences
                </h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Enable Task Completion Notifications
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Show friendly toast cards when an agent finishes a deliverable
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Enable Task Completion Notifications"
                  checked={settings.notificationsEnabled}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      notificationsEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    Notification Chime Sound
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                    Play a soft celebration arpeggio on task completion
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Enable Notification Sounds"
                  checked={settings.notificationSoundsEnabled}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      notificationSoundsEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#493A35]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor="camera-sens-slider"
                    className="font-bold text-[#493A35] dark:text-[#E9EAF2]"
                  >
                    Camera Pan Sensitivity
                  </label>
                  <span className="font-mono-num">
                    {settings.cameraSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  id="camera-sens-slider"
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={settings.cameraSensitivity}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({
                      ...s,
                      cameraSensitivity: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#493A35] dark:accent-[#AFA1F5]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClearNotifications();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6]"
                >
                  Clear Notification History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
