import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AgentCharacter,
  InteractiveObject,
  RoomId,
  TaskItem,
  TimeOfDay,
  CameraState,
  AppSettings,
} from '../types/office';
import {
  ROOMS,
  ROOM_MAP,
  INTERACTIVE_OBJECTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../data/officeData';
import { renderOfficeWorld } from '../utils/pixelArtRenderer';
import { CharacterPortrait } from './CharacterPortrait';
import { soundEngine } from '../utils/soundEngine';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Play,
  Pause,
  Map as MapIcon,
  Compass,
  Sparkles,
  Coffee,
  Users,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Eye,
} from 'lucide-react';

interface OfficeViewportProps {
  agents: AgentCharacter[];
  tasks: TaskItem[];
  selectedAgentId: string | null;
  selectedRoomId: RoomId | null;
  camera: CameraState;
  settings: AppSettings;
  onCameraChange: (updater: (prev: CameraState) => CameraState) => void;
  onSelectAgent: (agentId: string | null) => void;
  onSelectRoom: (roomId: RoomId | null) => void;
  onResetCamera: () => void;
  onToggleSimulation: () => void;
  onChangeSpeed: (speed: number) => void;
  onTriggerBreakRoomCoffee: () => void;
  onTriggerMeetingHuddle: () => void;
  onOpenTaskBoard: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export const OfficeViewport: React.FC<OfficeViewportProps> = ({
  agents,
  tasks,
  selectedAgentId,
  selectedRoomId,
  camera,
  settings,
  onCameraChange,
  onSelectAgent,
  onSelectRoom,
  onResetCamera,
  onToggleSimulation,
  onChangeSpeed,
  onTriggerBreakRoomCoffee,
  onTriggerMeetingHuddle,
  onOpenTaskBoard,
  onToggleMute,
  onToggleMusic,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [activeObject, setActiveObject] = useState<InteractiveObject | null>(null);
  const [plantRustleMessage, setPlantRustleMessage] = useState<string | null>(null);
  const [miniMapExpanded, setMiniMapExpanded] = useState<boolean>(true);

  // Refs for latest state inside animation loop
  const stateRef = useRef({
    agents,
    tasks,
    selectedAgentId,
    selectedRoomId,
    hoveredAgentId,
    hoveredObjectId,
    camera,
    settings,
  });

  useEffect(() => {
    stateRef.current = {
      agents,
      tasks,
      selectedAgentId,
      selectedRoomId,
      hoveredAgentId,
      hoveredObjectId,
      camera,
      settings,
    };
  }, [
    agents,
    tasks,
    selectedAgentId,
    selectedRoomId,
    hoveredAgentId,
    hoveredObjectId,
    camera,
    settings,
  ]);

  // Drag / Pinch state
  const pointerStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    camStartX: number;
    camStartY: number;
    dragDist: number;
    pinchDist: number | null;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    camStartX: 0,
    camStartY: 0,
    dragDist: 0,
    pinchDist: null,
  });

  // Smoothly interpolated camera for display
  const smoothCamRef = useRef<{ x: number; y: number; zoom: number }>({
    x: camera.x,
    y: camera.y,
    zoom: camera.zoom,
  });

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cam = smoothCamRef.current;
    const wx = (sx - rect.width / 2) / cam.zoom + cam.x;
    const wy = (sy - rect.height / 2) / cam.zoom + cam.y;
    return { x: wx, y: wy };
  }, []);

  // Main Canvas Render Loop (~30 FPS for crisp pixel-art animation and low CPU load)
  useEffect(() => {
    let rafId = 0;
    const startTime = performance.now();
    let lastDrawTime = 0;

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      if (now - lastDrawTime < 32) return;
      lastDrawTime = now;

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.max(1, Math.floor(rect.width * dpr));
        const targetH = Math.max(1, Math.floor(rect.height * dpr));

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const {
            agents: curAgents,
            tasks: curTasks,
            selectedAgentId: curSelAgent,
            selectedRoomId: curSelRoom,
            hoveredAgentId: curHovAgent,
            hoveredObjectId: curHovObj,
            camera: targetCam,
            settings: curSettings,
          } = stateRef.current;

          // If following an agent, update target camera center to agent position
          let desiredX = targetCam.x;
          let desiredY = targetCam.y;
          if (targetCam.followingAgentId) {
            const followed = curAgents.find((a) => a.id === targetCam.followingAgentId);
            if (followed) {
              desiredX = followed.position.x;
              desiredY = followed.position.y;
            }
          }

          const lerpFactor = curSettings.reduceMotion ? 1 : 0.18;
          smoothCamRef.current.x += (desiredX - smoothCamRef.current.x) * lerpFactor;
          smoothCamRef.current.y += (desiredY - smoothCamRef.current.y) * lerpFactor;
          smoothCamRef.current.zoom +=
            (targetCam.zoom - smoothCamRef.current.zoom) * lerpFactor;

          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.imageSmoothingEnabled = false;

          // Clear viewport
          ctx.fillStyle = curSettings.theme === 'dark' ? '#12141F' : '#E9D9BF';
          ctx.fillRect(0, 0, rect.width, rect.height);

          // Apply camera transform
          ctx.translate(rect.width / 2, rect.height / 2);
          ctx.scale(smoothCamRef.current.zoom, smoothCamRef.current.zoom);
          ctx.translate(-smoothCamRef.current.x, -smoothCamRef.current.y);

          const timeSec = (now - startTime) / 1000;
          renderOfficeWorld(ctx, {
            agents: curAgents,
            tasks: curTasks,
            selectedAgentId: curSelAgent,
            hoveredObjectId: curHovObj,
            hoveredAgentId: curHovAgent,
            selectedRoomId: curSelRoom,
            timeOfDay: curSettings.timeOfDay as TimeOfDay,
            isDark: curSettings.theme === 'dark',
            ambientIntensity: curSettings.ambientLightingIntensity,
            reduceMotion: curSettings.reduceMotion,
            timeSec,
          });

          ctx.restore();
        }
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Keyboard navigation for camera when canvas container is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      const step = 65 * settings.cameraSensitivity;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        onCameraChange((c) => ({
          ...c,
          x: Math.max(150, c.x - step),
          followingAgentId: null,
        }));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        onCameraChange((c) => ({
          ...c,
          x: Math.min(WORLD_WIDTH - 150, c.x + step),
          followingAgentId: null,
        }));
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        onCameraChange((c) => ({
          ...c,
          y: Math.max(120, c.y - step),
          followingAgentId: null,
        }));
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        onCameraChange((c) => ({
          ...c,
          y: Math.min(WORLD_HEIGHT - 120, c.y + step),
          followingAgentId: null,
        }));
      } else if (e.key === 'Escape') {
        setActiveObject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCameraChange, settings.cameraSensitivity]);

  // Pointer & Wheel Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    pointerStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      camStartX: smoothCamRef.current.x,
      camStartY: smoothCamRef.current.y,
      dragDist: 0,
      pinchDist: null,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ps = pointerStateRef.current;
    if (ps.isDragging) {
      const dx = e.clientX - ps.startX;
      const dy = e.clientY - ps.startY;
      ps.dragDist = Math.hypot(dx, dy);

      if (ps.dragDist > 4) {
        const zoom = smoothCamRef.current.zoom;
        const sens = settings.cameraSensitivity;
        const nextX = Math.max(
          120,
          Math.min(WORLD_WIDTH - 120, ps.camStartX - (dx / zoom) * sens)
        );
        const nextY = Math.max(
          100,
          Math.min(WORLD_HEIGHT - 100, ps.camStartY - (dy / zoom) * sens)
        );
        onCameraChange((prev) => ({
          ...prev,
          x: nextX,
          y: nextY,
          followingAgentId: null,
        }));
      }
      return;
    }

    // Hit-test characters and interactive objects for hover cursor
    const worldPt = screenToWorld(e.clientX, e.clientY);
    const hitAgent = [...agents]
      .reverse()
      .find(
        (a) =>
          Math.abs(worldPt.x - a.position.x) <= 26 &&
          Math.abs(worldPt.y - a.position.y) <= 34
      );

    if (hitAgent) {
      setHoveredAgentId(hitAgent.id);
      setHoveredObjectId(null);
      return;
    }
    setHoveredAgentId(null);

    const hitObj = INTERACTIVE_OBJECTS.find(
      (obj) =>
        worldPt.x >= obj.x &&
        worldPt.x <= obj.x + obj.width &&
        worldPt.y >= obj.y &&
        worldPt.y <= obj.y + obj.height
    );
    setHoveredObjectId(hitObj ? hitObj.id : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ps = pointerStateRef.current;
    ps.isDragging = false;

    // Only treat as a click if pointer moved less than 6px
    if (ps.dragDist < 6) {
      const worldPt = screenToWorld(e.clientX, e.clientY);

      // 1. Check Character Click
      const hitAgent = [...agents]
        .reverse()
        .find(
          (a) =>
            Math.abs(worldPt.x - a.position.x) <= 28 &&
            Math.abs(worldPt.y - a.position.y) <= 36
        );
      if (hitAgent) {
        soundEngine.playSelectCharacter();
        setActiveObject(null);
        onSelectAgent(hitAgent.id);
        return;
      }

      // 2. Check Interactive Furniture/Object Click
      const hitObj = INTERACTIVE_OBJECTS.find(
        (obj) =>
          worldPt.x >= obj.x &&
          worldPt.x <= obj.x + obj.width &&
          worldPt.y >= obj.y &&
          worldPt.y <= obj.y + obj.height
      );
      if (hitObj) {
        soundEngine.playClick();
        if (hitObj.type === 'doorway' && hitObj.targetRoomId) {
          onSelectRoom(hitObj.targetRoomId);
          setActiveObject(null);
          return;
        }
        if (hitObj.type === 'plant') {
          setPlantRustleMessage(`You gently rustled the ${hitObj.name} leaves!`);
          setTimeout(() => setPlantRustleMessage(null), 3000);
        }
        setActiveObject(hitObj);
        return;
      }

      // 3. Clicked empty floor -> clear active object popover
      setActiveObject(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    onCameraChange((prev) => {
      const nextZoom = Math.max(0.48, Math.min(2.2, Number((prev.zoom * zoomFactor).toFixed(2))));
      return { ...prev, zoom: nextZoom };
    });
  };

  // Touch gestures for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      pointerStateRef.current = {
        isDragging: true,
        startX: t.clientX,
        startY: t.clientY,
        camStartX: smoothCamRef.current.x,
        camStartY: smoothCamRef.current.y,
        dragDist: 0,
        pinchDist: null,
      };
    } else if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pointerStateRef.current.pinchDist = d;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const ps = pointerStateRef.current;
    if (e.touches.length === 2 && ps.pinchDist) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = d / ps.pinchDist;
      ps.pinchDist = d;
      onCameraChange((prev) => ({
        ...prev,
        zoom: Math.max(0.48, Math.min(2.2, Number((prev.zoom * ratio).toFixed(2)))),
      }));
      return;
    }
    if (e.touches.length === 1 && ps.isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - ps.startX;
      const dy = t.clientY - ps.startY;
      ps.dragDist = Math.hypot(dx, dy);
      if (ps.dragDist > 4) {
        const zoom = smoothCamRef.current.zoom;
        onCameraChange((prev) => ({
          ...prev,
          x: Math.max(120, Math.min(WORLD_WIDTH - 120, ps.camStartX - dx / zoom)),
          y: Math.max(100, Math.min(WORLD_HEIGHT - 100, ps.camStartY - dy / zoom)),
          followingAgentId: null,
        }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const ps = pointerStateRef.current;
    if (ps.isDragging && ps.dragDist < 8 && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const worldPt = screenToWorld(t.clientX, t.clientY);
      const hitAgent = [...agents]
        .reverse()
        .find(
          (a) =>
            Math.abs(worldPt.x - a.position.x) <= 32 &&
            Math.abs(worldPt.y - a.position.y) <= 38
        );
      if (hitAgent) {
        soundEngine.playSelectCharacter();
        onSelectAgent(hitAgent.id);
      }
    }
    ps.isDragging = false;
    ps.pinchDist = null;
  };

  const assignedObjectAgent = activeObject?.assignedAgentId
    ? agents.find((a) => a.id === activeObject.assignedAgentId)
    : null;
  const assignedObjectTask = assignedObjectAgent
    ? tasks.find(
        (t) =>
          t.assignedAgentId === assignedObjectAgent.id && t.status === 'In Progress'
      )
    : null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden bg-[#EFE2CB] dark:bg-[#12141F] select-none"
      data-testid="office-viewport"
    >
      {/* Interactive Pixel-Art World Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`block w-full h-full pixelated ${
          hoveredAgentId || hoveredObjectId
            ? 'cursor-pointer'
            : pointerStateRef.current.isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
        }`}
        aria-label="Cozy Pixel Office Interactive World Canvas"
      />

      {/* Top Floating Room Navigation Strip */}
      <div
        className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none"
        role="region"
        aria-label="Room Camera Presets"
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#FFF4DF]/95 dark:bg-[#222535]/95 border border-[#DECBB1] dark:border-[#3B4054] shadow-sm pointer-events-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              soundEngine.playRoomTransition();
              onSelectRoom(null);
              onResetCamera();
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedRoomId === null
                ? 'bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923]'
                : 'text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#F8EBD5] dark:hover:bg-[#2B3042]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Entire Office</span>
          </button>

          {ROOMS.map((room) => {
            const countInRoom = agents.filter((a) => a.currentRoomId === room.id).length;
            const isSelected = selectedRoomId === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  soundEngine.playRoomTransition();
                  onSelectRoom(room.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923]'
                    : 'text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#F8EBD5] dark:hover:bg-[#2B3042]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: room.accentColor }}
                />
                <span>{room.shortName}</span>
                <span className="font-mono-num text-[11px] opacity-75">({countInRoom})</span>
              </button>
            );
          })}
        </div>

        {/* Following Character Banner if active */}
        {camera.followingAgentId && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#493A35] dark:bg-[#AFA1F5] text-[#FFF4DF] dark:text-[#171923] text-xs font-semibold shadow-sm pointer-events-auto">
            <Eye className="w-3.5 h-3.5" />
            <span>
              Following{' '}
              {agents.find((a) => a.id === camera.followingAgentId)?.name || 'Agent'}
            </span>
            <button
              type="button"
              onClick={() =>
                onCameraChange((prev) => ({ ...prev, followingAgentId: null }))
              }
              className="ml-1 underline text-[11px] opacity-90 hover:opacity-100"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Playful Plant Rustle Feedback Toast */}
      {plantRustleMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#222535] dark:text-[#A7D8BE] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-medium shadow-md pointer-events-none flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#F5B99B]" />
          <span>{plantRustleMessage}</span>
        </div>
      )}

      {/* Contextual Interactive Environment Object Popover */}
      {activeObject && (
        <div
          className="absolute top-16 left-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-[#FFF4DF] dark:bg-[#222535] border-2 border-[#8B6F5A] dark:border-[#3B4054] shadow-lg p-4 pointer-events-auto"
          role="dialog"
          aria-label={activeObject.name}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] font-semibold text-[#7C6354] dark:text-[#A8ADC2]">
                {ROOM_MAP[activeObject.roomId]?.name} · Interactive Object
              </div>
              <h3 className="text-sm font-bold text-[#493A35] dark:text-[#E9EAF2]">
                {activeObject.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveObject(null)}
              aria-label="Close object details"
              className="p-1 rounded-lg text-[#7C6354] dark:text-[#A8ADC2] hover:bg-[#F8EBD5] dark:hover:bg-[#2B3042]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#7C6354] dark:text-[#A8ADC2] leading-relaxed mb-3">
            {activeObject.description}
          </p>

          {/* Assigned Agent Workstation Details */}
          {assignedObjectAgent && (
            <div className="p-2.5 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] mb-3">
              <div className="flex items-center gap-2.5">
                <CharacterPortrait
                  agent={assignedObjectAgent}
                  size={36}
                  isDark={settings.theme === 'dark'}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#493A35] dark:text-[#E9EAF2] truncate">
                    {assignedObjectAgent.name} · {assignedObjectAgent.role}
                  </div>
                  <div className="text-[11px] text-[#7C6354] dark:text-[#A8ADC2] truncate">
                    {assignedObjectTask
                      ? `Working on: ${assignedObjectTask.title} (${Math.round(
                          assignedObjectTask.progress
                        )}%)`
                      : `Currently ${assignedObjectAgent.behavior}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectAgent(assignedObjectAgent.id);
                  setActiveObject(null);
                }}
                className="mt-2 w-full py-1.5 px-3 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Inspect {assignedObjectAgent.name}
              </button>
            </div>
          )}

          {/* Contextual Actions per Object Type */}
          {activeObject.type === 'coffee-machine' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onTriggerBreakRoomCoffee();
                setActiveObject(null);
              }}
              className="w-full py-2 px-3 rounded-lg bg-[#8B6F5A] text-[#FFF4DF] dark:bg-[#E9B49B] dark:text-[#171923] text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Invite Idle Agent for Fresh Espresso</span>
            </button>
          )}

          {activeObject.type === 'meeting-table' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onTriggerMeetingHuddle();
                setActiveObject(null);
              }}
              className="w-full py-2 px-3 rounded-lg bg-[#8B6F5A] text-[#FFF4DF] dark:bg-[#A7D8BE] dark:text-[#171923] text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Start Quick Team Standup</span>
            </button>
          )}

          {activeObject.type === 'task-board' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenTaskBoard();
                setActiveObject(null);
              }}
              className="w-full py-2 px-3 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Open Full Interactive Task Board</span>
            </button>
          )}

          {activeObject.type === 'window' && (
            <div className="text-xs font-medium text-[#493A35] dark:text-[#E9EAF2] bg-[#F8EBD5] dark:bg-[#2B3042] px-3 py-2 rounded-lg">
              Current sky: <span className="font-bold">{settings.timeOfDay}</span>{' '}
              {settings.theme === 'dark' ? '(Nighttime Office Mode)' : '(Daylight Office)'}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Pixel-Art Mini-Map (Bottom-Left) */}
      {settings.showMiniMap && (
        <div
          className="hidden sm:block absolute bottom-16 left-3 z-10 rounded-xl bg-[#FFF4DF]/95 dark:bg-[#222535]/95 border border-[#DECBB1] dark:border-[#3B4054] shadow-md overflow-hidden pointer-events-auto"
          role="region"
          aria-label="Office Mini-Map"
        >
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#DECBB1] dark:border-[#3B4054]">
            <span className="text-[11px] font-bold text-[#493A35] dark:text-[#E9EAF2] flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5 text-[#8B6F5A] dark:text-[#AFA1F5]" />
              <span>Office Floor Map</span>
            </span>
            <button
              type="button"
              onClick={() => setMiniMapExpanded((v) => !v)}
              className="text-[11px] font-semibold text-[#7C6354] dark:text-[#A8ADC2] hover:underline"
              aria-label={miniMapExpanded ? 'Collapse Mini-Map' : 'Expand Mini-Map'}
            >
              {miniMapExpanded ? 'Hide' : 'Show'}
            </button>
          </div>

          {miniMapExpanded && (
            <div className="p-2">
              <div className="relative w-44 h-28 rounded-lg bg-[#EFE2CB] dark:bg-[#171923] border border-[#DECBB1] dark:border-[#3B4054] overflow-hidden">
                {/* Rooms in Mini-Map */}
                {ROOMS.map((room) => {
                  const leftPct = (room.bounds.x / WORLD_WIDTH) * 100;
                  const topPct = (room.bounds.y / WORLD_HEIGHT) * 100;
                  const widthPct = (room.bounds.width / WORLD_WIDTH) * 100;
                  const heightPct = (room.bounds.height / WORLD_HEIGHT) * 100;
                  const isCurrent = selectedRoomId === room.id;

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playRoomTransition();
                        onSelectRoom(room.id);
                      }}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                      }}
                      title={`Jump to ${room.name}`}
                      className={`absolute rounded-xs border text-[8px] font-bold flex items-center justify-center transition-colors ${
                        isCurrent
                          ? 'border-[#493A35] dark:border-[#AFA1F5] bg-[#F5B99B]/55 dark:bg-[#AFA1F5]/35 text-[#493A35] dark:text-[#E9EAF2]'
                          : 'border-[#8B6F5A]/50 dark:border-[#3B4054] bg-[#FFF4DF]/80 dark:bg-[#2B3042]/80 text-[#7C6354] dark:text-[#A8ADC2] hover:bg-[#F5B99B]/30'
                      }`}
                    >
                      <span className="truncate px-0.5">{room.shortName}</span>
                    </button>
                  );
                })}

                {/* Live Agent Dots on Mini-Map */}
                {agents.map((agent) => {
                  const ax = (agent.position.x / WORLD_WIDTH) * 100;
                  const ay = (agent.position.y / WORLD_HEIGHT) * 100;
                  const isSel = agent.id === selectedAgentId;
                  return (
                    <span
                      key={agent.id}
                      style={{ left: `${ax}%`, top: `${ay}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none ${
                        isSel
                          ? 'w-2.5 h-2.5 bg-[#D96B43] dark:bg-[#A7D8BE] ring-2 ring-white'
                          : 'w-1.5 h-1.5 bg-[#493A35] dark:bg-[#E9EAF2]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Integrated World Control Bar (Strictly Single Row) */}
      <div
        className="absolute bottom-3 left-3 right-3 h-11 flex items-center justify-between gap-2 px-3 rounded-xl bg-[#FFF4DF]/95 dark:bg-[#222535]/95 border border-[#DECBB1] dark:border-[#3B4054] shadow-md pointer-events-auto"
        role="toolbar"
        aria-label="World Camera and Simulation Controls"
      >
        {/* Left: Simulation Play/Pause & Speed */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onToggleSimulation();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            {settings.simulationRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          <div
            className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054]"
            role="group"
            aria-label="Simulation Speed"
          >
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onChangeSpeed(spd);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono-num font-semibold transition-colors ${
                  settings.simulationSpeed === spd
                    ? 'bg-[#493A35] text-[#FFF4DF] dark:bg-[#AFA1F5] dark:text-[#171923]'
                    : 'text-[#7C6354] dark:text-[#A8ADC2] hover:text-[#493A35] dark:hover:text-[#E9EAF2]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Camera Zoom & Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onCameraChange((prev) => ({
                ...prev,
                zoom: Math.max(0.45, Number((prev.zoom - 0.1).toFixed(2))),
              }));
            }}
            aria-label="Zoom Out"
            className="p-1.5 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span
            className="px-2 py-1 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-mono-num font-semibold text-[#493A35] dark:text-[#E9EAF2] min-w-[52px] text-center"
            aria-label="Current Zoom Level"
          >
            {Math.round(camera.zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onCameraChange((prev) => ({
                ...prev,
                zoom: Math.min(2.2, Number((prev.zoom + 0.1).toFixed(2))),
              }));
            }}
            aria-label="Zoom In"
            className="p-1.5 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onResetCamera();
            }}
            aria-label="Reset Camera"
            className="px-2.5 py-1 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-medium text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054] flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSelectRoom(null);
              onCameraChange(() => ({
                x: WORLD_WIDTH / 2,
                y: WORLD_HEIGHT / 2,
                zoom: 0.54,
                followingAgentId: null,
              }));
            }}
            aria-label="Fit Entire Office"
            className="hidden lg:flex px-2.5 py-1 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-xs font-medium text-[#493A35] dark:text-[#E9EAF2] hover:bg-[#EFE0C6] dark:hover:bg-[#3B4054] items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit All</span>
          </button>
        </div>

        {/* Right: Quick Ambient Sound Bar */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleMusic}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              settings.musicEnabled
                ? 'bg-[#B8D0B0]/40 dark:bg-[#A7D8BE]/25 border-[#8B6F5A] dark:border-[#A7D8BE] text-[#493A35] dark:text-[#A7D8BE]'
                : 'bg-[#F8EBD5] dark:bg-[#2B3042] border-[#DECBB1] dark:border-[#3B4054] text-[#7C6354] dark:text-[#A8ADC2]'
            }`}
          >
            {settings.musicEnabled ? `♪ ${settings.ambientMode}` : '♪ Lo-Fi'}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={settings.isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-lg bg-[#F8EBD5] dark:bg-[#2B3042] border border-[#DECBB1] dark:border-[#3B4054] text-[#493A35] dark:text-[#E9EAF2]"
          >
            {settings.isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-[#E53E3E]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
