import React, { useEffect, useRef } from 'react';
import { AgentCharacter } from '../types/office';
import { drawCharacterSprite } from '../utils/pixelArtRenderer';

interface CharacterPortraitProps {
  agent: AgentCharacter;
  size?: number;
  className?: string;
  isDark?: boolean;
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  agent,
  size = 40,
  className = '',
  isDark = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, size, size);
    const scale = Math.max(1.5, (size / 40) * 2.1);
    const portraitAgent: AgentCharacter = {
      ...agent,
      behavior: 'idle',
      celebrationTimer: 0,
    };
    drawCharacterSprite(
      ctx,
      portraitAgent,
      size / 2,
      size * 0.62,
      0.5,
      scale,
      isDark,
      true
    );
  }, [agent, size, isDark]);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-lg border border-[#DECBB1] dark:border-[#3B4054] bg-[#FFF4DF] dark:bg-[#171923] overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pixelated block"
        aria-hidden="true"
      />
    </div>
  );
};
