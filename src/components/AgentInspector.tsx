import React, { useState } from 'react';
import {
  AgentCharacter,
  TaskItem,
  ActivityEvent,
  ProductivityMetrics,
  TimeOfDay,
  RoomId,
} from '../types/office';
import { ROOM_MAP } from '../data/officeData';
import { CharacterPortrait } from './CharacterPortrait';
import { soundEngine } from '../utils/soundEngine';
import {
  Crosshair,
  Eye,
  Coffee,
  Briefcase,
  CheckCircle2,
  Clock,
  ListTodo,
  X,
  ChevronRight,
  ChevronLeft,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Plus,
} from 'lucide-react';

interface AgentInspectorProps {
  selectedAgent: AgentCharacter | null;
  tasks: TaskItem[];
  recentEvents: ActivityEvent[];
  metrics: ProductivityMetrics;
  followingAgentId: string | null;
  isCollapsed: boolean;
  isDark: boolean;
  timeOfDay: TimeOfDay;
  onToggleCollapse: () => void;
  onDismissAgent: () => void;
  onFocusAgent: (agent: AgentCharacter) => void;
  onToggleFollowAgent: (agentId: string) => void;
  onSendAgentToBreak: (agentId: string) => void;
  onReturnAgentToWork: (agentId: string) => void;
  onCompleteTaskNow: (taskId: string) => void;
  onViewAgentTasks: (agentId: string) => void;
  onAddQuickTask: (agentId: string, title: string, roomId: RoomId) => void;
  onChangeTimeOfDay: (tod: TimeOfDay) => void;
  onSelectAgentById: (agentId: string) => void;
}

const BEHAVIOR_LABELS: Record<string, string> = {
  working: 'Working at Desk',
  walking: 'Walking in Office',
  idle: 'Taking a Breather',
  socializing: 'Chatting with Coworker',
  'taking-break': 'Sipping Coffee in Break Room',
  'completing-task': 'Celebrating Task Completion!',
  'in-meeting': 'Collaborating in Meeting Room',
};

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  selectedAgent,
  tasks,
  recentEvents,
  metrics,
  followingAgentId,
  isCollapsed,
  isDark,
  timeOfDay,
  onToggleCollapse,
  onDismissAgent,
  onFocusAgent,
  onToggleFollowAgent,
  onSendAgentToBreak,
  onReturnAgentToWork,
  onCompleteTaskNow,
  onViewAgentTasks,
  onAddQuickTask,
  onChangeTimeOfDay,
  onSelectAgentById,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (isCollapsed) {
    return (
      <aside
        className="hidden md:flex flex-col items-center py-3 px-1.5 border-l border-[#DECBB1] dark:border-[#3B4054] bg-[#F8EBD5] dark:bg-[#222535] shrink-0"
        aria-label="Collapsed Inspector Panel"
      >
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onToggleCollapse();
          }}
          aria-label="Expand Inspector Panel"
          title="Expand Inspector Panel"
          className="p-2 rounded-lg text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#2B3042]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  if (!selectedAgent) {
    // Default Right Inspector: Compact Office Overview & Live Feed
    return (
      <aside
        className="w-80 lg:w-84 border-l border-[#DECBB1] dark:border-[#3B4054] bg-[#F8EBD5] dark:bg-[#222535] flex flex-col h-full shrink-0 overflow-hidden"
        aria-label="Office Overview Inspector"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DECBB1] dark:border-[#3B4054]">
          <div>
            <h2 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
              Office Pulse
            </h2>
            <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
              Mood: {metrics.officeMood}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onToggleCollapse();
            }}
            aria-label="Collapse Inspector Panel"
            className="hidden md:inline-flex p-1.5 rounded-lg text-[#7C6354] dark:text-[#A8ADC2] hover:bg-[#EFE0C6] dark:hover:bg-[#2B3042]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Quick Time of Day Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                Day / Night Atmosphere
              </span>
              <span className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                {timeOfDay}
              </span>
            </div>
            <div
              className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#EFE0C6] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054]"
              role="group"
              aria-label="Time of Day Selector"
            >
              {(
                [
                  { id: 'Morning', icon: Sunrise },
                  { id: 'Afternoon', icon: Sun },
                  { id: 'Evening', icon: Sunset },
                  { id: 'Night', icon: Moon },
                ] as const
              ).map(({ id, icon: Icon }) => {
                const active = timeOfDay === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onChangeTimeOfDay(id);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 transition-colors ${
                      active
                        ? 'bg-[#FFF4DF] dark:bg-[#2B3042] text-[#493A35] dark:text-[#E9EAF2] shadow-xs'
                        : 'text-[#7C6354] dark:text-[#A8ADC2] hover:text-[#493A35] dark:hover:text-[#E9EAF2]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Metric Summary Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
              <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                Active Agents
              </div>
              <div className="mt-1 text-xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                {metrics.workingCount} / {metrics.totalAgents}
              </div>
              <div className="mt-0.5 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                {metrics.idleOrBreakCount} on break or moving
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
              <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                Completion
              </div>
              <div className="mt-1 text-xl font-bold font-mono-num text-[#493A35] dark:text-[#E9EAF2]">
                {metrics.completionPercentage}%
              </div>
              <div className="mt-0.5 text-[11px] text-[#7C6354] dark:text-[#A8ADC2]">
                {metrics.completedTasks} done · {metrics.inProgressTasks} active
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="p-3.5 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                Daily Sprint Progress
              </span>
              <span className="font-mono-num font-semibold text-[#7C6354] dark:text-[#A8ADC2]">
                {metrics.completedTasks} / {tasks.length} tasks
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
              <div
                className="h-full bg-[#8B6F5A] dark:bg-[#A7D8BE] transition-all duration-300"
                style={{ width: `${metrics.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Tip Box */}
          <div className="p-3 rounded-xl bg-[#EFE0C6]/75 dark:bg-[#171923]/75 border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-relaxed">
            Click any character in the pixel office or roster to inspect their current task, follow them with the camera, or invite them for a coffee break.
          </div>

          {/* Recent Office Activity Stream */}
          <div>
            <h3 className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-2.5">
              Recent Office Activity
            </h3>
            <div className="space-y-2">
              {recentEvents.slice(0, 6).map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => onSelectAgentById(evt.agentId)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] hover:border-[#8B6F5A] dark:hover:border-[#AFA1F5] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#7C6354] dark:text-[#A8ADC2] mb-0.5">
                    <span className="font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                      {evt.agentName}
                    </span>
                    <span className="font-mono-num">{evt.inWorldTime}</span>
                  </div>
                  <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-snug">
                    {evt.message}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Selected Agent Details View
  const agentTasks = tasks.filter((t) => t.assignedAgentId === selectedAgent.id);
  const activeTask = agentTasks.find((t) => t.status === 'In Progress');
  const queuedTasks = agentTasks.filter((t) => t.status === 'Queued');
  const completedTasks = agentTasks.filter((t) => t.status === 'Completed');
  const isFollowing = followingAgentId === selectedAgent.id;
  const currentRoom = ROOM_MAP[selectedAgent.currentRoomId];

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    soundEngine.playClick();
    onAddQuickTask(
      selectedAgent.id,
      newTaskTitle.trim(),
      selectedAgent.homeRoomId
    );
    setNewTaskTitle('');
  };

  return (
    <aside
      className="w-80 lg:w-88 border-l border-[#DECBB1] dark:border-[#3B4054] bg-[#F8EBD5] dark:bg-[#222535] flex flex-col h-full shrink-0 overflow-hidden"
      aria-label={`Agent Inspector for ${selectedAgent.name}`}
      data-testid="agent-inspector"
    >
      {/* Inspector Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#DECBB1] dark:border-[#3B4054]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#7C6354] dark:text-[#A8ADC2]">
            Agent Profile
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onDismissAgent();
            }}
            aria-label="Dismiss Selection"
            className="px-2 py-1 rounded-lg text-xs font-medium text-[#7C6354] dark:text-[#A8ADC2] hover:bg-[#EFE0C6] dark:hover:bg-[#2B3042] flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Character Identity Card */}
        <div className="p-3.5 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
          <div className="flex items-start gap-3">
            <CharacterPortrait
              agent={selectedAgent}
              size={56}
              isDark={isDark}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#493A35] dark:text-[#E9EAF2] truncate">
                {selectedAgent.name}
              </h2>
              <div className="text-xs font-medium text-[#8B6F5A] dark:text-[#E9B49B]">
                {selectedAgent.role} · {selectedAgent.accessory}
              </div>
              <div className="mt-1 text-xs text-[#7C6354] dark:text-[#A8ADC2]">
                Room: <span className="font-semibold text-[#493A35] dark:text-[#E9EAF2]">{currentRoom?.name}</span>
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-relaxed">
            {selectedAgent.personality}
          </p>

          <div className="mt-3 pt-2.5 border-t border-[#DECBB1] dark:border-[#3B4054] flex items-center justify-between text-xs">
            <span className="text-[#7C6354] dark:text-[#A8ADC2]">Behavior State</span>
            <span className="font-semibold text-[#493A35] dark:text-[#A7D8BE]">
              {BEHAVIOR_LABELS[selectedAgent.behavior] || selectedAgent.behavior}
            </span>
          </div>
        </div>

        {/* Camera & Character Interaction Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onFocusAgent(selectedAgent);
            }}
            className="py-2 px-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054] flex items-center justify-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Focus Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onToggleFollowAgent(selectedAgent.id);
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isFollowing
                ? 'bg-[#493A35] text-[#FFF4DF] border-[#493A35] dark:bg-[#AFA1F5] dark:text-[#171923] dark:border-[#AFA1F5]'
                : 'bg-[#FFF4DF] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isFollowing ? 'Following' : 'Follow Agent'}</span>
          </button>

          {selectedAgent.behavior !== 'taking-break' ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onSendAgentToBreak(selectedAgent.id);
              }}
              className="py-2 px-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054] flex items-center justify-center gap-1.5"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Coffee Break</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onReturnAgentToWork(selectedAgent.id);
              }}
              className="py-2 px-3 rounded-xl bg-[#493A35] text-[#FFF4DF] dark:bg-[#A7D8BE] dark:text-[#171923] text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Return to Work</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onViewAgentTasks(selectedAgent.id);
            }}
            className="py-2 px-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-semibold text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054] flex items-center justify-center gap-1.5"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>View Tasks</span>
          </button>
        </div>

        {/* Current Active Task Card */}
        <div className="p-3.5 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8B6F5A] dark:text-[#E9B49B]" />
              <span>Current Task</span>
            </span>
            {activeTask && (
              <span className="text-[11px] font-semibold text-[#7C6354] dark:text-[#A8ADC2]">
                {activeTask.priority} Priority · {activeTask.status}
              </span>
            )}
          </div>

          {activeTask ? (
            <>
              <div className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                {activeTask.title}
              </div>
              <p className="mt-1 text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-relaxed">
                {activeTask.description}
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#7C6354] dark:text-[#A8ADC2]">Task Progress</span>
                  <span className="font-mono-num font-bold text-[#493A35] dark:text-[#E9EAF2]">
                    {Math.round(activeTask.progress)}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#EFE0C6] dark:bg-[#171923] overflow-hidden">
                  <div
                    className="h-full bg-[#8B6F5A] dark:bg-[#A7D8BE] transition-all duration-300"
                    style={{ width: `${activeTask.progress}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onCompleteTaskNow(activeTask.id);
                }}
                className="mt-3 w-full py-1.5 px-3 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Task Now</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-[#7C6354] dark:text-[#A8ADC2] py-2">
              All queued tasks finished! Add a new task below.
            </div>
          )}
        </div>

        {/* Quick Assign Task Form */}
        <form
          onSubmit={handleQuickAddSubmit}
          className="p-3 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]"
        >
          <label
            htmlFor="quick-task-input"
            className="block text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-1.5"
          >
            Assign New Task to {selectedAgent.name}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="quick-task-input"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g., Polish sprite shadows..."
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#F8EBD5] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] text-xs text-[#493A35] dark:text-[#E9EAF2] placeholder:text-[#7C6354]/70 dark:placeholder:text-[#A8ADC2]/60 focus:outline-none focus:ring-2 focus:ring-[#8B6F5A]"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Queue</span>
            </button>
          </div>
        </form>

        {/* Upcoming Queued Tasks */}
        <div>
          <h3 className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-2">
            Upcoming Queue ({queuedTasks.length})
          </h3>
          {queuedTasks.length === 0 ? (
            <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2]">
              No queued tasks waiting.
            </p>
          ) : (
            <div className="space-y-1.5">
              {queuedTasks.map((qt) => (
                <div
                  key={qt.id}
                  className="p-2.5 rounded-xl bg-[#FFF4DF] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs"
                >
                  <div className="font-semibold text-[#493A35] dark:text-[#E9EAF2]">
                    {qt.title}
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2] mt-0.5">
                    {qt.priority} Priority · Est. {qt.estimatedDuration}s
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tasks History */}
        <div>
          <h3 className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] mb-2">
            Completed Tasks ({completedTasks.length})
          </h3>
          <div className="space-y-1.5">
            {completedTasks.map((ct) => (
              <div
                key={ct.id}
                className="p-2.5 rounded-xl bg-[#EFE0C6]/70 dark:bg-[#171923]/70 border border-[#DECBB1] dark:border-[#3B4054] text-xs flex items-start gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5F9E71] dark:text-[#A7D8BE] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[#493A35] dark:text-[#E9EAF2] line-through opacity-80">
                    {ct.title}
                  </div>
                  {ct.completionTime && (
                    <div className="text-[10px] font-mono-num text-[#7C6354] dark:text-[#A8ADC2]">
                      Completed at {ct.completionTime}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
