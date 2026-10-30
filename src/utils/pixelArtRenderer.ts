import {
  AgentCharacter,
  InteractiveObject,
  RoomDef,
  TaskItem,
  TimeOfDay,
} from '../types/office';
import {
  ROOMS,
  INTERACTIVE_OBJECTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CORRIDOR_Y,
} from '../data/officeData';

// Helper to draw a crisp integer-aligned rectangle
function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Helper to draw a pixel-art bordered box
function pixelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  border = '#493A35',
  borderWidth = 2
) {
  rect(ctx, x, y, w, h, border);
  rect(
    ctx,
    x + borderWidth,
    y + borderWidth,
    w - borderWidth * 2,
    h - borderWidth * 2,
    fill
  );
}

/**
 * Renders a standalone character sprite centered at (cx, cy) with pixel size `scale`
 * Used both on the main world canvas AND in portrait avatars across the UI.
 */
export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  agent: AgentCharacter,
  cx: number,
  cy: number,
  timeSec: number,
  scale = 3,
  isDark = false,
  reduceMotion = false
) {
  const animTime = reduceMotion ? 0 : timeSec;
  const p = scale; // 1 logical pixel = `scale` canvas units

  // Compute subtle animation offsets based on behavior state
  const isWalking = agent.behavior === 'walking';
  const isWorking = agent.behavior === 'working';
  const isCelebrating = agent.behavior === 'completing-task' || agent.celebrationTimer > 0;
  const isBreak = agent.behavior === 'taking-break';

  const walkCycle = isWalking ? Math.sin(animTime * 11 + cx * 0.1) : 0;
  const bobY = isCelebrating
    ? -Math.abs(Math.sin(animTime * 10)) * 6
    : isWalking
    ? -Math.abs(walkCycle) * 3
    : Math.sin(animTime * 2.6 + cx) * 1.2;

  const px = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(cx + gx * p),
      Math.round(cy + bobY + gy * p),
      Math.ceil(gw * p),
      Math.ceil(gh * p)
    );
  };

  const outline = isDark ? '#231B18' : '#493A35';

  // Soft ground shadow (stays on floor)
  ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(73, 58, 53, 0.22)';
  ctx.fillRect(Math.round(cx - 6 * p), Math.round(cy + 6 * p), Math.round(12 * p), Math.round(3 * p));

  // Legs / Feet (except floating ghost)
  if (agent.species !== 'ghost') {
    const leftLegY = isWalking && walkCycle > 0.2 ? 4 : 5;
    const rightLegY = isWalking && walkCycle < -0.2 ? 4 : 5;
    px(-4, leftLegY, 3, 3, outline);
    px(-3, leftLegY, 2, 2, agent.primaryColor);
    px(1, rightLegY, 3, 3, outline);
    px(1, rightLegY, 2, 2, agent.primaryColor);
  } else {
    // Ghost wavy bottom hem
    const wave = Math.round(Math.sin(animTime * 5) * 1);
    px(-5, 4, 10, 3, outline);
    px(-4, 4, 8, 2, agent.primaryColor);
    px(-4, 6 + wave * 0.3, 2, 1, agent.primaryColor);
    px(0, 6 - wave * 0.3, 2, 1, agent.primaryColor);
    px(3, 6 + wave * 0.3, 2, 1, agent.primaryColor);
  }

  // Tail (behind body)
  if (agent.species === 'cat' || agent.species === 'red-panda' || agent.species === 'shiba') {
    const tailWag = Math.round(Math.sin(animTime * 4 + cx) * 1);
    px(5, 0 + tailWag, 3, 4, outline);
    px(5, 1 + tailWag, 2, 2, agent.primaryColor);
    if (agent.species === 'red-panda') {
      px(6, 1 + tailWag, 1, 2, agent.secondaryColor);
    }
  }

  // Torso / Outfit (hoodie, cardigan, tunic)
  px(-6, -1, 12, 6, outline);
  px(-5, 0, 10, 5, agent.outfitColor);
  // Outfit collar / detail
  px(-2, 0, 4, 2, agent.secondaryColor);
  if (agent.species === 'penguin') {
    // White tuxedo belly + sky bowtie
    px(-3, 0, 6, 5, '#FFFFFF');
    px(-2, 0, 4, 1, agent.outfitColor);
  }

  // Head base (12x8 pixel head with dark outline)
  px(-6, -9, 12, 8, outline);
  px(-5, -8, 10, 7, agent.primaryColor);

  // Species-specific ears, cheeks & head features
  switch (agent.species) {
    case 'cat': {
      // Pointy cat ears
      px(-6, -12, 4, 3, outline);
      px(-5, -11, 2, 2, agent.primaryColor);
      px(2, -12, 4, 3, outline);
      px(3, -11, 2, 2, agent.primaryColor);
      // Forehead tabby stripes
      px(-1, -8, 2, 2, '#C86D32');
      break;
    }
    case 'bunny': {
      // Tall bunny ears
      const earBob = isWalking ? 1 : 0;
      px(-5, -15 + earBob, 3, 6, outline);
      px(-4, -14 + earBob, 2, 5, agent.primaryColor);
      px(-4, -13 + earBob, 1, 3, agent.secondaryColor);
      px(2, -15 + earBob, 3, 6, outline);
      px(2, -14 + earBob, 2, 5, agent.primaryColor);
      px(3, -13 + earBob, 1, 3, agent.secondaryColor);
      // Studio headphones band & earcups
      px(-7, -7, 2, 4, '#F3C6D3');
      px(5, -7, 2, 4, '#F3C6D3');
      px(-6, -10, 12, 1, '#F3C6D3');
      break;
    }
    case 'frog': {
      // Top frog eye bumps
      px(-5, -11, 4, 3, outline);
      px(-4, -10, 3, 2, agent.primaryColor);
      px(1, -11, 4, 3, outline);
      px(1, -10, 3, 2, agent.primaryColor);
      // Rosy cheeks
      px(-5, -4, 2, 1, '#F5B99B');
      px(3, -4, 2, 1, '#F5B99B');
      break;
    }
    case 'bear': {
      // Round bear ears
      px(-6, -11, 3, 3, outline);
      px(-5, -10, 2, 2, agent.primaryColor);
      px(3, -11, 3, 3, outline);
      px(3, -10, 2, 2, agent.primaryColor);
      // Bear snout
      px(-2, -4, 4, 2, agent.secondaryColor);
      px(-1, -4, 2, 1, outline);
      break;
    }
    case 'ghost': {
      // Cute floating wisp crest
      px(-2, -11, 4, 2, outline);
      px(-1, -10, 2, 2, agent.primaryColor);
      // Pastel blush
      px(-4, -4, 2, 1, '#F3C6D3');
      px(2, -4, 2, 1, '#F3C6D3');
      break;
    }
    case 'duck': {
      // Little top tuft
      px(-1, -11, 3, 2, outline);
      px(0, -10, 2, 1, agent.primaryColor);
      // Orange duck bill
      px(-2, -4, 4, 2, '#F49756');
      break;
    }
    case 'hamster': {
      // Round ears + chubby cream cheeks
      px(-6, -11, 3, 2, outline);
      px(3, -11, 3, 2, outline);
      px(-5, -5, 3, 3, agent.secondaryColor);
      px(2, -5, 3, 3, agent.secondaryColor);
      break;
    }
    case 'penguin': {
      // White face patch & yellow beak
      px(-4, -7, 8, 5, '#FFFFFF');
      px(-1, -4, 2, 2, '#F6AD55');
      break;
    }
    case 'red-panda': {
      // Pointy ears + artist beret + white eyebrow puffs
      px(-6, -11, 3, 2, outline);
      px(3, -11, 3, 2, outline);
      // Artist beret
      px(-4, -12, 9, 3, outline);
      px(-3, -11, 7, 2, agent.outfitColor);
      px(-4, -6, 2, 2, agent.secondaryColor);
      px(2, -6, 2, 2, agent.secondaryColor);
      break;
    }
    case 'shiba': {
      // Pointy shiba ears + cream lower face + mint scarf
      px(-5, -12, 3, 3, outline);
      px(-4, -11, 2, 2, agent.primaryColor);
      px(2, -12, 3, 3, outline);
      px(2, -11, 2, 2, agent.primaryColor);
      px(-4, -4, 8, 3, agent.secondaryColor);
      px(-5, -1, 10, 2, '#88C4A6');
      break;
    }
  }

  // Eyes (blink occasionally)
  const isBlinking = !reduceMotion && Math.sin(animTime * 1.9 + cx * 0.3) > 0.94;
  if (isBlinking) {
    px(-4, -5, 2, 1, outline);
    px(2, -5, 2, 1, outline);
  } else {
    px(-4, -6, 2, 2, outline);
    px(2, -6, 2, 2, outline);
    // Eye sparkle
    px(-4, -6, 1, 1, '#FFFFFF');
    px(2, -6, 1, 1, '#FFFFFF');
  }

  // Round spectacles for Hamster (Peanut)
  if (agent.species === 'hamster') {
    px(-5, -7, 4, 1, '#493A35');
    px(1, -7, 4, 1, '#493A35');
    px(-1, -6, 2, 1, '#493A35');
  }

  // Hands / Props based on behavioral state
  if (isWorking) {
    // Alternating typing hands
    const leftHandY = Math.sin(animTime * 16 + cx) > 0 ? 1 : 2;
    const rightHandY = Math.sin(animTime * 16 + cx) <= 0 ? 1 : 2;
    px(-6, leftHandY, 2, 2, agent.primaryColor);
    px(4, rightHandY, 2, 2, agent.primaryColor);
  } else if (isBreak || agent.species === 'frog') {
    // Holding a warm ceramic coffee mug
    px(4, 0, 4, 4, outline);
    px(5, 1, 2, 2, '#FFF4DF');
    // Rising pixel steam from mug
    if (!reduceMotion) {
      const steamOffset = Math.round((animTime * 3) % 3);
      px(5, -2 - steamOffset, 1, 1, 'rgba(255, 244, 223, 0.75)');
    }
  } else if (isCelebrating) {
    // Raised celebratory arms
    px(-7, -3, 2, 3, agent.primaryColor);
    px(5, -3, 2, 3, agent.primaryColor);
  } else {
    // Relaxed arms at sides
    px(-6, 1, 2, 3, agent.primaryColor);
    px(4, 1, 2, 3, agent.primaryColor);
  }

  // Celebratory pixel stars when completing a task
  if (isCelebrating) {
    const starColors = ['#F6AD55', '#F3C6D3', '#A7D8BE', '#B9D9ED'];
    for (let i = 0; i < 4; i++) {
      const angle = animTime * 4 + (i * Math.PI) / 2;
      const sx = Math.cos(angle) * 9;
      const sy = -11 + Math.sin(angle * 1.5) * 3;
      px(sx, sy, 2, 2, starColors[i % starColors.length]);
    }
  }
}

/**
 * Renders the outdoor window view according to TimeOfDay and Dark Mode
 */
function drawWindowView(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  timeOfDay: TimeOfDay,
  isDark: boolean,
  timeSec: number
) {
  const effectiveNight = isDark || timeOfDay === 'Night';
  let skyTop = '#99CEEE';
  let skyBottom = '#E4F3FA';

  if (effectiveNight) {
    skyTop = '#14182E';
    skyBottom = '#262B4E';
  } else if (timeOfDay === 'Morning') {
    skyTop = '#8CC8EB';
    skyBottom = '#FDE4BA';
  } else if (timeOfDay === 'Evening') {
    skyTop = '#7B679A';
    skyBottom = '#F5A67E';
  }

  // Frame
  pixelBox(ctx, x, y, w, h, skyTop, isDark ? '#3B4054' : '#6E5646', 4);
  rect(ctx, x + 4, y + h / 2, w - 8, h / 2 - 4, skyBottom);

  if (effectiveNight) {
    // Crescent moon & twinkling stars
    rect(ctx, x + w - 34, y + 10, 12, 12, '#FFF3B0');
    rect(ctx, x + w - 30, y + 10, 8, 8, skyTop);
    const stars = [
      { sx: 18, sy: 12 },
      { sx: 46, sy: 18 },
      { sx: 78, sy: 11 },
      { sx: 105, sy: 20 },
    ];
    stars.forEach((st, idx) => {
      const twinkle = Math.sin(timeSec * 3 + idx * 1.7) > 0 ? 4 : 2;
      rect(ctx, x + st.sx, y + st.sy, twinkle, twinkle, '#FFF4DF');
    });
    // Distant city skyline silhouette
    rect(ctx, x + 8, y + h - 16, 26, 12, '#1A1F38');
    rect(ctx, x + 38, y + h - 20, 22, 16, '#1A1F38');
    rect(ctx, x + 64, y + h - 14, 30, 10, '#1A1F38');
    // Tiny lit windows in skyline
    rect(ctx, x + 44, y + h - 16, 4, 4, '#F6C177');
    rect(ctx, x + 52, y + h - 12, 4, 4, '#F6C177');
  } else {
    // Sun & drifting pixel clouds
    const sunColor = timeOfDay === 'Evening' ? '#F48C56' : '#FFE082';
    const sunY = timeOfDay === 'Evening' ? y + h - 22 : y + 10;
    rect(ctx, x + w - 36, sunY, 14, 14, sunColor);

    const cloudShift = Math.round((timeSec * 4) % 40);
    rect(ctx, x + 16 + cloudShift, y + 14, 28, 8, '#FFFFFF');
    rect(ctx, x + 22 + cloudShift, y + 10, 16, 4, '#FFFFFF');
    // Distant green hills
    rect(ctx, x + 4, y + h - 12, w - 8, 8, timeOfDay === 'Evening' ? '#6D8C7A' : '#9DC395');
  }

  // Window mullions / panes
  const frameColor = isDark ? '#3B4054' : '#8B6F5A';
  rect(ctx, x + w / 2 - 2, y + 4, 4, h - 8, frameColor);
  rect(ctx, x + 4, y + h / 2 - 1, w - 8, 3, frameColor);
  // Window sill
  rect(ctx, x - 4, y + h, w + 8, 6, isDark ? '#4A3F39' : '#B89980');
}

/**
 * Draws a desk workstation with monitor, lamp, keyboard, and chair
 */
function drawWorkstation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDark: boolean,
  timeOfDay: TimeOfDay,
  timeSec: number,
  screenAccent = '#A7D8BE',
  hasDrawingTablet = false
) {
  const isNightLight = isDark || timeOfDay === 'Night' || timeOfDay === 'Evening';
  const woodTop = isDark ? '#5C473C' : '#C99E7A';
  const woodEdge = isDark ? '#3D2E27' : '#9C7454';
  const outline = isDark ? '#1E1816' : '#493A35';

  // Chair tucked behind/under desk
  pixelBox(ctx, x + w / 2 - 16, y + h - 8, 32, 22, isDark ? '#3E4663' : '#8B9BB4', outline, 2);

  // Desk shadow
  rect(ctx, x + 4, y + 8, w, h - 6, isDark ? 'rgba(0,0,0,0.4)' : 'rgba(73,58,53,0.14)');

  // Desk tabletop
  pixelBox(ctx, x, y, w, h - 10, woodTop, outline, 2);
  rect(ctx, x + 2, y + h - 18, w - 4, 6, woodEdge);

  // Desk legs
  rect(ctx, x + 6, y + h - 10, 6, 10, outline);
  rect(ctx, x + w - 12, y + h - 10, 6, 10, outline);

  // Computer Monitor
  const monX = x + w / 2 - 22;
  const monY = y - 14;
  pixelBox(ctx, monX, monY, 44, 28, '#2B3042', outline, 2);
  // Screen content
  const screenBg = isNightLight ? '#1E293B' : '#334155';
  rect(ctx, monX + 3, monY + 3, 38, 20, screenBg);
  // Animated code/design lines on monitor
  const lineShift = Math.floor(timeSec * 2) % 3;
  rect(ctx, monX + 6, monY + 6, 18 + lineShift * 3, 3, screenAccent);
  rect(ctx, monX + 6, monY + 11, 26 - lineShift * 2, 3, '#F3C6D3');
  rect(ctx, monX + 6, monY + 16, 14 + lineShift * 2, 3, '#B9D9ED');
  // Monitor stand
  rect(ctx, monX + 18, monY + 28, 8, 5, outline);
  rect(ctx, monX + 12, monY + 32, 20, 3, outline);

  // Keyboard or Drawing Tablet on desk
  if (hasDrawingTablet) {
    pixelBox(ctx, monX + 6, y + 22, 32, 16, '#3B4054', outline, 2);
    rect(ctx, monX + 10, y + 25, 24, 10, '#F3C6D3');
  } else {
    pixelBox(ctx, monX + 8, y + 24, 28, 10, '#E2E8F0', outline, 2);
  }

  // Desk Lamp on left corner
  const lampX = x + 10;
  const lampY = y + 4;
  rect(ctx, lampX, lampY + 14, 10, 4, outline);
  rect(ctx, lampX + 3, lampY + 4, 4, 10, '#D69E2E');
  pixelBox(ctx, lampX - 2, lampY - 2, 14, 8, isNightLight ? '#F6E05E' : '#ECC94B', outline, 2);

  // Sticky note / notebook on right corner
  rect(ctx, x + w - 24, y + 18, 14, 12, '#FFF4DF');
  rect(ctx, x + w - 22, y + 21, 10, 2, '#F5B99B');
  rect(ctx, x + w - 22, y + 25, 8, 2, '#B8D0B0');
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  timeSec: number,
  isDark: boolean,
  reduceMotion: boolean
) {
  const sway = reduceMotion ? 0 : Math.round(Math.sin(timeSec * 2.2 + x) * 2);
  const outline = isDark ? '#1E1816' : '#493A35';
  // Terracotta pot
  pixelBox(ctx, x + 10, y + 30, 24, 20, isDark ? '#9C5A44' : '#D97B59', outline, 2);
  rect(ctx, x + 8, y + 28, 28, 6, isDark ? '#B06850' : '#E88D6B');
  // Lush pixel leaves
  const leafDark = isDark ? '#3B6E52' : '#5F9E71';
  const leafLight = isDark ? '#589471' : '#88C494';
  pixelBox(ctx, x + 12 + sway, y + 6, 20, 22, leafDark, outline, 2);
  pixelBox(ctx, x + 4 + sway, y + 14, 16, 14, leafLight, outline, 2);
  pixelBox(ctx, x + 24 + sway, y + 12, 16, 15, leafLight, outline, 2);
}

/**
 * Main world renderer called inside the OfficeCanvas loop.
 */
export function renderOfficeWorld(
  ctx: CanvasRenderingContext2D,
  opts: {
    agents: AgentCharacter[];
    tasks: TaskItem[];
    selectedAgentId: string | null;
    hoveredObjectId: string | null;
    hoveredAgentId: string | null;
    selectedRoomId: string | null;
    timeOfDay: TimeOfDay;
    isDark: boolean;
    ambientIntensity: number;
    reduceMotion: boolean;
    timeSec: number;
  }
) {
  const {
    agents,
    selectedAgentId,
    hoveredObjectId,
    hoveredAgentId,
    timeOfDay,
    isDark,
    ambientIntensity,
    reduceMotion,
    timeSec,
  } = opts;

  ctx.imageSmoothingEnabled = false;

  // 1. Exterior Canvas Backdrop
  const worldBg = isDark
    ? '#141622'
    : timeOfDay === 'Night'
    ? '#1D2136'
    : timeOfDay === 'Evening'
    ? '#EAD2C0'
    : '#EFE2CB';
  rect(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, worldBg);

  // Subtle exterior dot grid
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(73,58,53,0.05)';
  for (let gx = 20; gx < WORLD_WIDTH; gx += 40) {
    for (let gy = 20; gy < WORLD_HEIGHT; gy += 40) {
      ctx.fillRect(gx, gy, 3, 3);
    }
  }

  // 2. Central Connecting Corridor (Y: 480 to 560, X: 60 to 1540)
  const corridorFloor = isDark ? '#1F2334' : '#E8D6BC';
  const wallBorder = isDark ? '#3B4054' : '#6E5646';
  pixelBox(ctx, 60, 476, 1480, 88, corridorFloor, wallBorder, 4);

  // Corridor runner rug & directional stepping stones
  rect(ctx, 90, 506, 1420, 28, isDark ? '#2B3148' : '#DCC4A4');
  for (let cx = 120; cx < 1480; cx += 64) {
    rect(ctx, cx, 514, 32, 12, isDark ? '#353C57' : '#CBB08E');
  }

  // 3. Draw Each of the Six Rooms
  ROOMS.forEach((room: RoomDef) => {
    const { x, y, width, height } = room.bounds;
    const floorFill = isDark ? room.floorColorDark : room.floorColorLight;
    const headerWallH = 54;
    const wallFill = isDark ? '#2A2F45' : '#FFF8EC';
    const baseboardFill = isDark ? '#3B425E' : '#D5BFA3';

    // Room Outer Shell & Floor
    pixelBox(ctx, x, y, width, height, floorFill, wallBorder, 4);

    // Top Interior Wall Strip
    rect(ctx, x + 4, y + 4, width - 8, headerWallH, wallFill);
    rect(ctx, x + 4, y + headerWallH, width - 8, 6, baseboardFill);

    // Subtle Floor Pattern per room
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(139, 111, 90, 0.06)';
    if (room.floorPattern === 'wood') {
      for (let py = y + headerWallH + 18; py < y + height - 8; py += 24) {
        ctx.fillRect(x + 8, py, width - 16, 2);
      }
    } else if (room.floorPattern === 'studio' || room.floorPattern === 'cafe') {
      for (let px = x + 12; px < x + width - 16; px += 36) {
        for (let py = y + headerWallH + 12; py < y + height - 16; py += 36) {
          if (((px + py) / 36) % 2 === 0) {
            ctx.fillRect(px, py, 18, 18);
          }
        }
      }
    } else if (room.floorPattern === 'tech') {
      for (let px = x + 24; px < x + width - 16; px += 48) {
        ctx.fillRect(px, y + headerWallH + 8, 2, height - headerWallH - 16);
      }
    }

    // Carve doorway opening into the corridor
    const doorX = room.doorway.x - 32;
    const isTopRow = y < 500;
    const doorY = isTopRow ? y + height - 8 : y - 4;
    rect(ctx, doorX, doorY, 64, 14, corridorFloor);
    // Cozy welcome mat at doorway
    pixelBox(
      ctx,
      doorX + 8,
      isTopRow ? y + height - 26 : y + 10,
      48,
      14,
      room.accentColor,
      wallBorder,
      2
    );
  });

  // 4. Room-Specific Furniture & Environmental Props

  // --- ROOM 1: MAIN WORKSPACE ---
  drawWindowView(ctx, 165, 66, 150, 44, timeOfDay, isDark, timeSec);
  // Wall clock
  pixelBox(ctx, 355, 74, 28, 28, isDark ? '#222535' : '#FFF4DF', wallBorder, 2);
  rect(ctx, 368, 80, 2, 9, '#E53E3E');
  rect(ctx, 368, 87, 7, 2, isDark ? '#E9EAF2' : '#493A35');
  // Wall shelf with pixel books
  rect(ctx, 78, 86, 68, 6, isDark ? '#5C473C' : '#A67C5B');
  rect(ctx, 84, 72, 10, 14, '#F5B99B');
  rect(ctx, 96, 74, 10, 12, '#B8D0B0');
  rect(ctx, 108, 70, 12, 16, '#B9D9ED');
  // Center area rug
  pixelBox(ctx, 215, 275, 165, 85, isDark ? '#323850' : '#EFE0C6', isDark ? '#454C69' : '#D5BFA3', 2);
  // Three Main Workspace Desks
  drawWorkstation(ctx, 130, 175, 110, 62, isDark, timeOfDay, timeSec, '#A7D8BE');
  drawWorkstation(ctx, 360, 175, 110, 62, isDark, timeOfDay, timeSec, '#B9D9ED');
  drawWorkstation(ctx, 130, 330, 110, 62, isDark, timeOfDay, timeSec, '#F5B99B');
  // Water cooler & filing cabinet
  pixelBox(ctx, 415, 330, 38, 56, isDark ? '#3B425E' : '#CBD5E1', wallBorder, 2);
  pixelBox(ctx, 464, 338, 28, 48, isDark ? '#4A5568' : '#E2E8F0', wallBorder, 2);
  rect(ctx, 468, 320, 20, 18, '#90CDF4');
  drawPlant(ctx, 472, 120, timeSec, isDark, reduceMotion);

  // --- ROOM 2: CREATIVE STUDIO ---
  drawWindowView(ctx, 725, 66, 150, 44, timeOfDay, isDark, timeSec);
  // Hanging string lights along studio top wall
  for (let lx = 585; lx <= 1015; lx += 36) {
    rect(ctx, lx, 62, 6, 6, isDark || timeOfDay === 'Night' ? '#F6E05E' : '#FBD38D');
  }
  // Wall Pixel-Art Posters
  pixelBox(ctx, 600, 72, 42, 34, '#F3C6D3', wallBorder, 2);
  rect(ctx, 610, 80, 22, 18, '#8B6F5A');
  pixelBox(ctx, 920, 72, 42, 34, '#D5C9F0', wallBorder, 2);
  rect(ctx, 930, 80, 22, 18, '#F5B99B');
  // Two Creative Tablet Desks
  drawWorkstation(ctx, 625, 180, 115, 64, isDark, timeOfDay, timeSec, '#F3C6D3', true);
  drawWorkstation(ctx, 865, 180, 115, 64, isDark, timeOfDay, timeSec, '#D5C9F0', true);
  // Pastel Moodboard & Swatches Table
  pixelBox(ctx, 640, 345, 130, 64, isDark ? '#4A3B54' : '#FFF4DF', wallBorder, 2);
  rect(ctx, 652, 355, 24, 18, '#F5B99B');
  rect(ctx, 682, 355, 24, 18, '#F3C6D3');
  rect(ctx, 712, 355, 24, 18, '#B8D0B0');
  rect(ctx, 742, 355, 18, 18, '#B9D9ED');
  rect(ctx, 652, 380, 108, 16, isDark ? '#32293B' : '#F8EBD5');
  // Studio Lounge Poufs
  pixelBox(ctx, 870, 355, 42, 36, '#F3C6D3', wallBorder, 2);
  pixelBox(ctx, 930, 365, 42, 36, '#D5C9F0', wallBorder, 2);
  drawPlant(ctx, 975, 120, timeSec, isDark, reduceMotion);

  // --- ROOM 3: MEETING ROOM ---
  // Interactive Sprint Whiteboard
  pixelBox(ctx, 1185, 70, 230, 44, isDark ? '#22283A' : '#FFFFFF', wallBorder, 3);
  rect(ctx, 1200, 80, 45, 24, '#F5B99B');
  rect(ctx, 1255, 80, 45, 24, '#B8D0B0');
  rect(ctx, 1310, 80, 45, 24, '#B9D9ED');
  rect(ctx, 1365, 80, 34, 24, '#D5C9F0');
  // Wall Presentation Screen
  pixelBox(ctx, 1085, 70, 76, 44, '#1E293B', wallBorder, 3);
  rect(ctx, 1095, 80, 56, 8, '#A7D8BE');
  rect(ctx, 1095, 94, 38, 10, '#F5B99B');
  // Oak Collaboration Conference Table
  // Chairs around table
  const chairColor = isDark ? '#3E4C59' : '#94B89B';
  [1210, 1285, 1360].forEach((cx) => {
    pixelBox(ctx, cx, 212, 34, 20, chairColor, wallBorder, 2);
    pixelBox(ctx, cx, 348, 34, 20, chairColor, wallBorder, 2);
  });
  pixelBox(ctx, 1175, 235, 250, 110, isDark ? '#5C473C' : '#C99E7A', wallBorder, 3);
  rect(ctx, 1185, 245, 230, 90, isDark ? '#6D5447' : '#D9B28F');
  // Laptops & presentation notes on meeting table
  pixelBox(ctx, 1215, 258, 28, 20, '#2B3042', wallBorder, 2);
  pixelBox(ctx, 1290, 258, 32, 22, '#FFF4DF', wallBorder, 2);
  pixelBox(ctx, 1365, 298, 28, 20, '#2B3042', wallBorder, 2);
  drawPlant(ctx, 1475, 120, timeSec, isDark, reduceMotion);

  // --- ROOM 4: COZY BREAK ROOM ---
  // Espresso Bar & Counter
  pixelBox(ctx, 105, 620, 195, 58, isDark ? '#4B3A35' : '#C89B7B', wallBorder, 3);
  // Espresso Machine
  pixelBox(ctx, 122, 598, 56, 42, '#D96B43', wallBorder, 2);
  rect(ctx, 132, 610, 14, 18, '#2D3748');
  rect(ctx, 152, 610, 14, 18, '#2D3748');
  // Animated coffee steam rising from espresso bar
  if (!reduceMotion) {
    const steamY = Math.round((timeSec * 12) % 14);
    rect(ctx, 138, 590 - steamY, 4, 6, 'rgba(255, 244, 223, 0.7)');
    rect(ctx, 158, 586 - ((steamY + 6) % 14), 4, 6, 'rgba(255, 244, 223, 0.6)');
  }
  // Pastry tray & mugs on counter
  pixelBox(ctx, 195, 626, 44, 26, '#FFF4DF', wallBorder, 2);
  rect(ctx, 203, 632, 12, 12, '#F49756');
  rect(ctx, 220, 632, 12, 12, '#F3C6D3');
  // Pastel Mint Retro Refrigerator
  pixelBox(ctx, 320, 592, 62, 86, isDark ? '#4F7A6E' : '#A7D8BE', wallBorder, 3);
  rect(ctx, 324, 632, 54, 3, wallBorder);
  rect(ctx, 370, 610, 4, 16, '#FFF4DF');
  rect(ctx, 370, 642, 4, 20, '#FFF4DF');
  // Café Round Table & Chairs
  pixelBox(ctx, 195, 755, 42, 36, isDark ? '#5C473C' : '#F5B99B', wallBorder, 2);
  pixelBox(ctx, 345, 755, 42, 36, isDark ? '#5C473C' : '#F5B99B', wallBorder, 2);
  pixelBox(ctx, 245, 735, 95, 78, isDark ? '#6D5447' : '#FFF4DF', wallBorder, 3);
  // Mugs on café table
  pixelBox(ctx, 268, 758, 14, 14, '#F3C6D3', wallBorder, 2);
  pixelBox(ctx, 304, 766, 14, 14, '#B9D9ED', wallBorder, 2);
  // Plush Lounge Sofa
  pixelBox(ctx, 385, 845, 125, 62, isDark ? '#6B4854' : '#E9967A', wallBorder, 3);
  rect(ctx, 395, 855, 50, 42, isDark ? '#825866' : '#F5B99B');
  rect(ctx, 450, 855, 50, 42, isDark ? '#825866' : '#F5B99B');
  // Break Room Window along bottom wall
  drawWindowView(ctx, 120, 932, 150, 42, timeOfDay, isDark, timeSec);
  drawPlant(ctx, 472, 620, timeSec, isDark, reduceMotion);

  // --- ROOM 5: QUIET FOCUS ROOM ---
  // Tall Oak Library Bookshelves
  pixelBox(ctx, 615, 590, 210, 56, isDark ? '#4A372B' : '#8B6F5A', wallBorder, 3);
  const bookColors = ['#F5B99B', '#B8D0B0', '#B9D9ED', '#D5C9F0', '#F3C6D3', '#F6E05E'];
  for (let bx = 626; bx < 810; bx += 16) {
    const bc = bookColors[(bx / 16) % bookColors.length];
    rect(ctx, bx, 600, 12, 18, bc);
    rect(ctx, bx, 624, 12, 18, bookColors[(bx / 16 + 2) % bookColors.length]);
  }
  // Serene Woven Zen Rug
  pixelBox(ctx, 700, 675, 195, 60, isDark ? '#27383B' : '#C9E4D4', wallBorder, 2);
  // Two Quiet Focus Pods
  drawWorkstation(ctx, 635, 745, 110, 62, isDark, timeOfDay, timeSec, '#C9E4D4');
  drawWorkstation(ctx, 860, 745, 110, 62, isDark, timeOfDay, timeSec, '#D5C9F0');
  // Reading armchair & floor lamp in corner
  pixelBox(ctx, 775, 875, 56, 48, isDark ? '#3D5245' : '#B8D0B0', wallBorder, 2);
  drawPlant(ctx, 965, 615, timeSec, isDark, reduceMotion);
  drawPlant(ctx, 585, 880, timeSec, isDark, reduceMotion);

  // --- ROOM 6: OPERATIONS ROOM ---
  // Server Racks with twinkling LEDs
  pixelBox(ctx, 1110, 592, 68, 66, '#1E2433', wallBorder, 3);
  pixelBox(ctx, 1188, 592, 68, 66, '#1E2433', wallBorder, 3);
  for (let row = 0; row < 4; row++) {
    const ledOn = Math.sin(timeSec * 6 + row * 1.4) > -0.2;
    rect(ctx, 1120, 602 + row * 13, 48, 8, '#2D3748');
    rect(ctx, 1124, 604 + row * 13, 6, 4, ledOn ? '#68D391' : '#2F855A');
    rect(ctx, 1134, 604 + row * 13, 6, 4, '#63B3ED');

    rect(ctx, 1198, 602 + row * 13, 48, 8, '#2D3748');
    rect(ctx, 1202, 604 + row * 13, 6, 4, '#68D391');
    rect(ctx, 1212, 604 + row * 13, 6, 4, ledOn ? '#F6AD55' : '#63B3ED');
  }
  // Operations Kanban & Network Board
  pixelBox(ctx, 1300, 594, 190, 58, isDark ? '#22283A' : '#FFF4DF', wallBorder, 3);
  rect(ctx, 1312, 604, 50, 38, isDark ? '#2D3748' : '#E2E8F0');
  rect(ctx, 1370, 604, 50, 38, isDark ? '#2D3748' : '#E2E8F0');
  rect(ctx, 1428, 604, 50, 38, isDark ? '#2D3748' : '#E2E8F0');
  // Task cards inside Kanban columns
  rect(ctx, 1316, 608, 42, 10, '#F5B99B');
  rect(ctx, 1316, 622, 42, 10, '#B9D9ED');
  rect(ctx, 1374, 608, 42, 10, '#D5C9F0');
  rect(ctx, 1432, 608, 42, 10, '#B8D0B0');
  rect(ctx, 1432, 622, 42, 10, '#B8D0B0');
  // Two Operations Terminals
  drawWorkstation(ctx, 1135, 755, 115, 64, isDark, timeOfDay, timeSec, '#63B3ED');
  drawWorkstation(ctx, 1365, 755, 115, 64, isDark, timeOfDay, timeSec, '#68D391');

  // 5. Interactive Object Hover / Selection Outlines
  if (hoveredObjectId) {
    const obj: InteractiveObject | undefined = INTERACTIVE_OBJECTS.find(
      (o) => o.id === hoveredObjectId
    );
    if (obj) {
      ctx.save();
      ctx.strokeStyle = isDark ? '#AFA1F5' : '#D96B43';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8);
      ctx.restore();
    }
  }

  // 6. Room Title Banners inside each room's top header wall
  ROOMS.forEach((room) => {
    const { x, y } = room.bounds;
    const badgeW = 148;
    const badgeH = 24;
    const bx = x + 14;
    const by = y + 12;
    pixelBox(
      ctx,
      bx,
      by,
      badgeW,
      badgeH,
      isDark ? '#1B1E2E' : '#FFF4DF',
      wallBorder,
      2
    );
    rect(ctx, bx + 6, by + 6, 10, 12, room.accentColor);
    ctx.fillStyle = isDark ? '#E9EAF2' : '#493A35';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name, bx + 22, by + badgeH / 2 + 1);
  });

  // 7. Sort Characters by Y coordinate for proper depth layering and draw them
  const sortedAgents = [...agents].sort((a, b) => a.position.y - b.position.y);

  sortedAgents.forEach((agent) => {
    const isSelected = agent.id === selectedAgentId;
    const isHovered = agent.id === hoveredAgentId;

    // Highlight ring under selected or hovered character
    if (isSelected || isHovered) {
      ctx.save();
      ctx.strokeStyle = isSelected
        ? isDark
          ? '#A7D8BE'
          : '#D96B43'
        : isDark
        ? '#AFA1F5'
        : '#8B6F5A';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.ellipse(
        agent.position.x,
        agent.position.y + 18,
        24,
        11,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    drawCharacterSprite(
      ctx,
      agent,
      agent.position.x,
      agent.position.y,
      timeSec,
      3,
      isDark,
      reduceMotion
    );

    // Character Name & Status Tag below sprite
    const tagText = agent.name;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(tagText).width;
    const pillW = Math.round(textW + 18);
    const pillH = 18;
    const pillX = Math.round(agent.position.x - pillW / 2);
    const pillY = Math.round(agent.position.y + 24);

    rect(
      ctx,
      pillX,
      pillY,
      pillW,
      pillH,
      isSelected
        ? isDark
          ? '#A7D8BE'
          : '#493A35'
        : isDark
        ? 'rgba(23, 25, 35, 0.88)'
        : 'rgba(255, 244, 223, 0.92)'
    );
    // Status dot inside tag
    const dotColor =
      agent.behavior === 'working'
        ? '#48BB78'
        : agent.behavior === 'walking'
        ? '#63B3ED'
        : agent.behavior === 'taking-break'
        ? '#F6AD55'
        : '#B794F4';
    rect(ctx, pillX + 5, pillY + 6, 5, 5, dotColor);

    ctx.fillStyle = isSelected
      ? isDark
        ? '#171923'
        : '#FFF4DF'
      : isDark
      ? '#E9EAF2'
      : '#493A35';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, pillX + 13, pillY + pillH / 2 + 0.5);

    // Speech bubble when socializing, taking break, or completing a task
    if (agent.speechBubble && (agent.speechTimer ?? 0) > 0) {
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      const bubbleW = Math.round(ctx.measureText(agent.speechBubble).width + 16);
      const bubbleH = 20;
      const bx = Math.round(agent.position.x - bubbleW / 2);
      const by = Math.round(agent.position.y - 58);
      pixelBox(ctx, bx, by, bubbleW, bubbleH, '#FFF4DF', '#493A35', 2);
      ctx.fillStyle = '#493A35';
      ctx.fillText(agent.speechBubble, bx + 8, by + bubbleH / 2 + 0.5);
    }
  });

  // 8. Atmospheric Day/Night & Warm Lamp Halos Overlay
  const isNight = isDark || timeOfDay === 'Night';
  const isEvening = !isNight && timeOfDay === 'Evening';
  const isMorning = !isNight && timeOfDay === 'Morning';

  if ((isNight || isEvening || isMorning) && ambientIntensity > 0.05) {
    ctx.save();
    if (isNight) {
      // Soft nighttime tint
      ctx.fillStyle = `rgba(15, 19, 38, ${(0.28 * ambientIntensity).toFixed(2)})`;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Warm golden lamp halos over all workstations, break room, and meeting table
      const lampSpots = [
        { x: 185, y: 195, r: 95 },
        { x: 415, y: 195, r: 95 },
        { x: 185, y: 350, r: 95 },
        { x: 682, y: 200, r: 100 },
        { x: 922, y: 200, r: 100 },
        { x: 1300, y: 280, r: 135 },
        { x: 165, y: 635, r: 105 },
        { x: 290, y: 770, r: 95 },
        { x: 690, y: 765, r: 95 },
        { x: 915, y: 765, r: 95 },
        { x: 1192, y: 775, r: 100 },
        { x: 1422, y: 775, r: 100 },
      ];
      ctx.globalCompositeOperation = 'screen';
      lampSpots.forEach((spot) => {
        const grad = ctx.createRadialGradient(spot.x, spot.y, 6, spot.x, spot.y, spot.r);
        grad.addColorStop(0, `rgba(255, 206, 122, ${(0.34 * ambientIntensity).toFixed(2)})`);
        grad.addColorStop(0.55, `rgba(245, 175, 95, ${(0.14 * ambientIntensity).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(245, 175, 95, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (isEvening) {
      // Warm sunset golden-orange wash
      ctx.fillStyle = `rgba(245, 158, 108, ${(0.12 * ambientIntensity).toFixed(2)})`;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else if (isMorning) {
      // Gentle morning sunlight beams below windows
      ctx.fillStyle = `rgba(255, 236, 179, ${(0.16 * ambientIntensity).toFixed(2)})`;
      ctx.fillRect(160, 112, 160, 70);
      ctx.fillRect(720, 112, 160, 70);
    }
    ctx.restore();
  }
}
