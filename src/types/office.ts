export type RoomId =
  | 'main-workspace'
  | 'creative-studio'
  | 'meeting-room'
  | 'break-room'
  | 'quiet-focus'
  | 'operations-room';

export type CharacterSpecies =
  | 'cat'
  | 'bunny'
  | 'frog'
  | 'bear'
  | 'ghost'
  | 'duck'
  | 'hamster'
  | 'penguin'
  | 'red-panda'
  | 'shiba';

export type BehaviorState =
  | 'working'
  | 'walking'
  | 'idle'
  | 'socializing'
  | 'taking-break'
  | 'completing-task'
  | 'in-meeting';

export type TaskStatus = 'Queued' | 'In Progress' | 'Completed' | 'Paused';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export type AmbientMode =
  | 'Cozy Café'
  | 'Rainy Afternoon'
  | 'Quiet Office'
  | 'Peaceful Night';

export type ActiveTab =
  | 'office'
  | 'overview'
  | 'agents'
  | 'tasks'
  | 'activity'
  | 'settings';

export interface Point {
  x: number;
  y: number;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  shortName: string;
  description: string;
  bounds: { x: number; y: number; width: number; height: number };
  floorColorLight: string;
  floorColorDark: string;
  accentColor: string;
  floorPattern: 'wood' | 'studio' | 'carpet' | 'cafe' | 'zen' | 'tech';
  doorway: Point;
  center: Point;
}

export type InteractiveObjectType =
  | 'computer'
  | 'coffee-machine'
  | 'meeting-table'
  | 'task-board'
  | 'plant'
  | 'window'
  | 'doorway'
  | 'bookshelf'
  | 'server-rack'
  | 'design-board';

export interface InteractiveObject {
  id: string;
  name: string;
  type: InteractiveObjectType;
  roomId: RoomId;
  x: number;
  y: number;
  width: number;
  height: number;
  assignedAgentId?: string;
  targetRoomId?: RoomId;
  description: string;
  interactionHint: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  status: TaskStatus;
  progress: number; // 0 to 100
  estimatedDuration: number; // seconds at 1x speed
  startTime?: string;
  completionTime?: string;
  priority: TaskPriority;
  roomId: RoomId;
}

export interface AgentCharacter {
  id: string;
  name: string;
  species: CharacterSpecies;
  role: string;
  personality: string;
  homeRoomId: RoomId;
  currentRoomId: RoomId;
  deskPosition: Point;
  position: Point;
  targetPosition: Point;
  path: Point[];
  direction: 'left' | 'right' | 'up' | 'down';
  behavior: BehaviorState;
  behaviorTimer: number;
  speechBubble?: string;
  speechTimer?: number;
  celebrationTimer: number;
  primaryColor: string;
  secondaryColor: string;
  outfitColor: string;
  accessory: string;
  speed: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  inWorldTime: string;
  agentId: string;
  agentName: string;
  type: 'task-start' | 'task-halfway' | 'task-complete' | 'room-move' | 'break' | 'meeting' | 'social';
  message: string;
  roomId: RoomId;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  taskTitle: string;
  message: string;
  read: boolean;
  dismissed: boolean;
}

export interface CameraState {
  x: number; // center world X
  y: number; // center world Y
  zoom: number;
  followingAgentId: string | null;
}

export interface AppSettings {
  simulationRunning: boolean;
  simulationSpeed: number; // 0.5, 1, 2, 4
  autoDayNight: boolean;
  timeOfDay: TimeOfDay;
  movementFrequency: 'Calm' | 'Balanced' | 'Lively';
  theme: 'light' | 'dark';
  ambientLightingIntensity: number; // 0.3 to 1.0
  uiAnimationIntensity: 'Normal' | 'Subtle';
  musicEnabled: boolean;
  musicVolume: number; // 0 to 1
  isMuted: boolean;
  ambientMode: AmbientMode;
  soundEffectsEnabled: boolean;
  sfxVolume: number; // 0 to 1
  notificationsEnabled: boolean;
  notificationSoundsEnabled: boolean;
  defaultZoom: number;
  cameraSensitivity: number;
  showMiniMap: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface ProductivityMetrics {
  totalAgents: number;
  workingCount: number;
  idleOrBreakCount: number;
  inProgressTasks: number;
  completedTasks: number;
  queuedTasks: number;
  pausedTasks: number;
  completionPercentage: number;
  officeMood: string;
}
