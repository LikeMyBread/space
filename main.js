'use strict';

const DEBUG = document.getElementById("debug");
const fpsDisplay = document.getElementById("fps-counter");
const shipCountDisplay = document.getElementById("ship-count");
const spawnBtn = document.getElementById("spawn-btn");
const spawnTenBtn = document.getElementById("spawn-ten-btn");
const fightBtn = document.getElementById("fight-btn");
const godModeBtn = document.getElementById("god-mode-btn");
const hitboxBtn = document.getElementById("hitbox-btn");
const pivotBtn = document.getElementById("pivot-btn");
const bodySelect = document.getElementById("body-select");
const engineSelect = document.getElementById("engine-select");
const paintSelect = document.getElementById("paint-select");
const radarCanvas = document.getElementById("radar-canvas");
const radarCtx = radarCanvas ? radarCanvas.getContext("2d") : null;
const playerLegendDot = document.getElementById("player-legend-dot");
const derelictLegendDot = document.getElementById("derelict-legend-dot");

const targetCanvas = document.getElementById("target-canvas");
const targetCtx = targetCanvas ? targetCanvas.getContext("2d") : null;
const targetIdBadge = document.getElementById("target-id-badge");
const targetHullVal = document.getElementById("target-hull-val");
const targetFactionVal = document.getElementById("target-faction-val");
const targetDistVal = document.getElementById("target-dist-val");
const targetStateVal = document.getElementById("target-state-val");
const targetShieldVal = document.getElementById("target-shield-val");
const targetShieldBar = document.getElementById("target-shield-bar");
const targetArmorVal = document.getElementById("target-armor-val");
const targetArmorBar = document.getElementById("target-armor-bar");

const shieldVal = document.getElementById("shield-val");
const shieldBar = document.getElementById("shield-bar");
const armorVal = document.getElementById("armor-val");
const armorBar = document.getElementById("armor-bar");
const energyVal = document.getElementById("energy-val");
const energyBar = document.getElementById("energy-bar");
const fuelVal = document.getElementById("fuel-val");
const fuelSegmentsContainer = document.getElementById("fuel-segments-container");
const statusHullName = document.getElementById("status-hull-name");
const statusEngineName = document.getElementById("status-engine-name");
const statusSpeedVal = document.getElementById("status-speed-val");
const statusMassVal = document.getElementById("status-mass-val");

let onTabPressed = null;
let onSelectNearestHostile = null;

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;
const OFFSCREEN = 100;
const PIXELS_PER_METER = 1;
const TURN_RATE = 0.04; // rad/frame
const ACCEL_LIMIT = 5; // seconds
const FORMATION_DISTANCE = 100; // px
const DISABLED_ARMOR_THRESHOLD = 0.2; // 20% armor threshold for disabling ships
const DEFAULT_SHIELD_REGEN_RATE = 0.5; // points per second (cut in half from 1.0)
const PIVOT_SIZE = 3; // px - size of pivot highlight for high-res visibility
const PIVOT_HALF = Math.floor(PIVOT_SIZE / 2);
let showHitboxes = false;
let showPivots = false;

// Radar exponential display constants and mapping function
// Maps distances 0..4000m continuously using an exponential/logarithmic curve.
// Ring distances: 500m (innermost), 1000m, 2000m, and 4000m (outermost ring).
// Contacts at 4000m+ are clamped to the outermost ring via a separate check.
const RADAR_MAX_DIST = 4000;
const RADAR_LOG_K = 500;
const RADAR_LOG_NORM = 1 / Math.log1p(RADAR_MAX_DIST / RADAR_LOG_K);
const RADAR_RINGS = [500, 1000, 2000, 4000];

function getRadarRadiusFraction(dist) {
  if (dist <= 0) return 0;
  if (dist >= RADAR_MAX_DIST) return 1.0;
  return Math.log1p(dist / RADAR_LOG_K) * RADAR_LOG_NORM;
}

function getRadarDotPosition(targetShip, playerShip) {
  if (!targetShip || !targetShip.sprite || !playerShip || !playerShip.sprite) return null;
  const cx = 110;
  const cy = 100;
  const maxR = 83; // Scope radius 86 minus margin 3

  const dx = targetShip.sprite.x - playerShip.sprite.x;
  const dy = targetShip.sprite.y - playerShip.sprite.y;
  const dist = Math.hypot(dx, dy);

  let r;
  if (dist >= RADAR_MAX_DIST) {
    r = maxR;
  } else if (dist <= 0) {
    r = 0;
  } else {
    r = maxR * getRadarRadiusFraction(dist);
  }

  const scaleR = dist > 0 ? (r / dist) : 0;
  return {
    rx: cx + dx * scaleR,
    ry: cy + dy * scaleR,
  };
}

if (typeof window !== 'undefined') {
  window.getRadarRadiusFraction = getRadarRadiusFraction;
  window.getRadarDotPosition = getRadarDotPosition;
  window.RADAR_RINGS = RADAR_RINGS;
  window.RADAR_MAX_DIST = RADAR_MAX_DIST;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(choices) {
  return choices[randomInt(0, choices.length - 1)];
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

const keyState = {};

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'ShiftLeft', 'ShiftRight',
  'Space', ' ', 'space',
  'w', 'a', 's', 'd',
  'arrowup', 'arrowleft', 'arrowdown', 'arrowright',
  'shift'
]);

function handleKeydown(event) {
  if (!event || !event.target) return;
  const tag = event.target.tagName ? event.target.tagName.toLowerCase() : '';
  // Make sure keys can still be inputted if a form or dropdown is focused.
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable) return;

  const code = event.code;
  const key = event.key ? event.key.toLowerCase() : '';

  if (code === 'Tab' || key === 'tab' || event.keyCode === 9) {
    event.preventDefault();
    if (typeof onTabPressed === 'function') {
      onTabPressed(event.shiftKey);
    }
    return;
  }

  // The X key selects the nearest hostile ship
  if (code === 'KeyX' || key === 'x' || event.keyCode === 88) {
    event.preventDefault();
    if (typeof onSelectNearestHostile === 'function') {
      onSelectNearestHostile();
    }
    return;
  }

  if (GAME_KEYS.has(code) || GAME_KEYS.has(key)) {
    if (code) keyState[code] = true;
    if (key) keyState[key] = true;
    if (event.keyCode) keyState[event.keyCode] = true;
    event.preventDefault();
  }
}

function handleKeyup(event) {
  if (!event || !event.target) return;
  const tag = event.target.tagName ? event.target.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable) return;

  const code = event.code;
  const key = event.key ? event.key.toLowerCase() : '';

  if (code) keyState[code] = false;
  if (key) keyState[key] = false;
  if (event.keyCode) keyState[event.keyCode] = false;
}

window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);
window.addEventListener('blur', () => {
  for (const k in keyState) {
    keyState[k] = false;
  }
});

function isThrusting() {
  return !!(keyState['KeyW'] || keyState['ArrowUp'] || keyState['w'] || keyState['arrowup'] || keyState[38] || keyState[87]);
}

function isReversing() {
  return !!(keyState['KeyS'] || keyState['ArrowDown'] || keyState['s'] || keyState['arrowdown'] || keyState[40] || keyState[83]);
}

function isTurningLeft() {
  const isShift = keyState['ShiftLeft'] || keyState['ShiftRight'] || keyState['shift'] || keyState[16];
  return !!((keyState['KeyA'] || keyState['ArrowLeft'] || keyState['a'] || keyState['arrowleft'] || keyState[37] || keyState[65]) && !isShift);
}

function isTurningRight() {
  return !!(keyState['KeyD'] || keyState['ArrowRight'] || keyState['d'] || keyState['arrowright'] || keyState[39] || keyState[68]);
}

function isFiring() {
  return !!(keyState['Space'] || keyState[' '] || keyState['space'] || keyState[32]);
}

let app;

// Available faction paint schemes.
// Replaces the exact factory red shade (RGB: 212, 33, 33) on ship hulls.
const FACTION_PAINTS = [
  { name: 'Red', hex: '#d42121', r: 212, g: 33, b: 33, label: 'Crimson Vanguard' },
  { name: 'Blue', hex: '#216cd4', r: 33, g: 108, b: 212, label: 'Cobalt Federation' },
  { name: 'Green', hex: '#21d454', r: 33, g: 212, b: 84, label: 'Emerald Syndicate' },
  { name: 'Gold', hex: '#d4a321', r: 212, g: 163, b: 33, label: 'Solaris Guild' },
  { name: 'Purple', hex: '#9d21d4', r: 157, g: 33, b: 212, label: 'Nebula Fleet' },
  { name: 'Cyan', hex: '#21c2d4', r: 33, g: 194, b: 212, label: 'Outer Colonies' },
  { name: 'Orange', hex: '#d45e21', r: 212, g: 94, b: 33, label: 'Corsair Raiders' },
  { name: 'Pink', hex: '#d4218b', r: 212, g: 33, b: 139, label: 'Nova Collective' },
];

// Weapon definitions
const WEAPONS_DATA = {
  light_blaster: {
    name: 'Light Blaster',
    damage: 1,
    img: "img/weapons/Blaster.png",
    size: 0,
    attachmentPoint: {x: 2, y: 10}, // down and to the right of top left corner (0-indexed)
    projectileOrigin: {x: 2, y: 2}, // relative to weapon top-left
    fireRate: 2, // shots per second (halved from 4)
    projectile: {
      damage: 1,
      img: "img/weapons/Blaster Bolt.png",
      pivot: {x: 1, y: 1},
      speed: 100, // px/s (doubled from 50 px/s)
      rotation: 0.1, // spin speed in rad/tick
      rotationSpeed: 0.1,
      lifetime: 0.875, // seconds (cut in half again from 1.75s; range is 87.5px at 100 px/s)
    }
  }
};

const HULLS_DATA = [
  {
    name: 'Anvil',
    mass: 20000, // kg
    pivot: {x: 15.5, y: 16.5},
    engine_mount: {x: 15, y: 24},
    img: "img/ships/Anvil.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 15, y: 17},
      }
    ],
  },
  {
    name: 'Avocado',
    mass: 20000, // kg
    pivot: {x: 15.5, y: 18},
    engine_mount: {x: 15, y: 28},
    img: "img/ships/Avocado.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: true,
        location: {x: 15, y: 20},
      }
    ],
  },
  {
    name: 'Boat',
    mass: 20000, // kg
    pivot: {x: 16.5, y: 16},
    engine_mount: {x: 16, y: 28},
    img: "img/ships/Boat.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: true,
        location: {x: 12, y: 8},
      },
      {
        size: 0,
        onTop: true,
        location: {x: 20, y: 8},
      }
    ],
  },
  {
    name: 'Crab',
    mass: 20000, // kg
    pivot: {x: 15.5, y: 18},
    engine_mount: {x: 15, y: 25},
    img: "img/ships/Crab.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 4, y: 11},
      },
      {
        size: 0,
        onTop: false,
        location: {x: 27, y: 11},
      }
    ],
  },
  {
    name: 'Delta',
    mass: 20000, // kg
    pivot: {x: 14.5, y: 17},
    engine_mount: {x: 14, y: 25},
    img: "img/ships/Delta.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 14, y: 16},
      }
    ],
  },
  {
    name: 'Hammer',
    mass: 20000, // kg
    pivot: {x: 15.5, y: 14},
    engine_mount: {x: 15, y: 24},
    img: "img/ships/Hammer.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 15, y: 14},
      }
    ],
  },
  {
    name: 'Protogon',
    mass: 20000, // kg
    pivot: {x: 10, y: 12},
    engine_mount: {x: 9, y: 20},
    img: "img/ships/Protogon.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 9, y: 12},
      }
    ],
  },
  {
    name: 'Shadow',
    mass: 20000, // kg
    pivot: {x: 15.5, y: 17},
    engine_mount: {x: 15, y: 28},
    img: "img/ships/Shadow.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 14, y: 8},
      },
      {
        size: 0,
        onTop: false,
        location: {x: 17, y: 8},
      }
    ],
  },
  {
    name: 'Shuttle',
    mass: 20000, // kg
    pivot: {x: 14.5, y: 16},
    engine_mount: {x: 14, y: 26},
    img: "img/ships/Shuttle.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 8, y: 15},
      }
    ],
  },
  {
    name: 'Skate',
    mass: 20000, // kg
    pivot: {x: 15.5, y: 14},
    engine_mount: {x: 15, y: 23},
    img: "img/ships/Skate.png",
    hullRadius: 6,
    shieldRadius: 20,
    hardpoints: [
      {
        size: 0,
        onTop: false,
        location: {x: 15, y: 14},
      }
    ],
  },
];

const ENGINES_DATA = [
  {
    name: 'thruster',
    pivot: {x: 3, y: 1},
    thrust: 250, // kN
    mass: 3500, // kg
    reversible: true,
    img: "img/engines/Thruster.png",
    imgLit: "img/engines/Thruster_lit.png",
    imgReverse: "img/engines/Thruster_reverse.png",
  },
  {
    name: 'turbo_thruster',
    pivot: {x: 1, y: 2},
    thrust: 500, // kN
    mass: 3500, // kg
    reversible: false,
    img: "img/engines/TurboThruster.png",
    imgLit: "img/engines/TurboThruster_lit.png",
  },
];

const ASSET_PATHS = [
  "img/ships/Anvil.png",
  "img/ships/Avocado.png",
  "img/ships/Boat.png",
  "img/ships/Crab.png",
  "img/ships/Delta.png",
  "img/ships/Hammer.png",
  "img/ships/Protogon.png",
  "img/ships/Shadow.png",
  "img/ships/Shuttle.png",
  "img/ships/Skate.png",
  "img/engines/Thruster.png",
  "img/engines/Thruster_lit.png",
  "img/engines/Thruster_reverse.png",
  "img/engines/TurboThruster.png",
  "img/engines/TurboThruster_lit.png",
  "img/weapons/Blaster.png",
  "img/weapons/Blaster Bolt.png",
  "img/stars/Star.png"
];

// Preloaded HTMLImageElements for direct pixel manipulation in memory
const rawImages = {};

function preloadRawImages(paths) {
  return Promise.all(
    paths.map((path) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          rawImages[path] = img;
          resolve(img);
        };
        img.onerror = () => {
          reject(new Error(`Failed to load image: ${path}`));
        };
        img.src = path;
      });
    })
  );
}

// In-memory cache for baked static ship textures: (hull + engine + paintColor + weapons)
const bakedTextureCache = new Map();

function getBakedShipTexture(hull, engineData, paintColor, weapons = []) {
  const weaponKey = weapons
    .map((w) => `${w.weapon.name}_${w.hardpoint.location.x},${w.hardpoint.location.y}_${w.hardpoint.onTop}`)
    .join(';');
  const cacheKey = `${hull.name}_${engineData.name}_${paintColor.name}_${weaponKey}`;

  if (bakedTextureCache.has(cacheKey)) {
    return bakedTextureCache.get(cacheKey);
  }

  const hullImg = rawImages[hull.img];
  const engineImg = rawImages[engineData.img];

  const ex = hull.engine_mount.x - engineData.pivot.x;
  const ey = hull.engine_mount.y - engineData.pivot.y;

  let minX = Math.min(0, ex);
  let minY = Math.min(0, ey);
  let maxX = Math.max(hullImg.width, ex + engineImg.width);
  let maxY = Math.max(hullImg.height, ey + engineImg.height);

  const weaponDrawList = weapons.map((slot) => {
    const wImg = rawImages[slot.weapon.img];
    const wx = slot.hardpoint.location.x - slot.weapon.attachmentPoint.x;
    const wy = slot.hardpoint.location.y - slot.weapon.attachmentPoint.y;
    minX = Math.min(minX, wx);
    minY = Math.min(minY, wy);
    maxX = Math.max(maxX, wx + wImg.width);
    maxY = Math.max(maxY, wy + wImg.height);
    return { img: wImg, x: wx, y: wy, onTop: slot.hardpoint.onTop };
  });

  const offsetX = -minX;
  const offsetY = -minY;
  const canvasWidth = maxX - minX;
  const canvasHeight = maxY - minY;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // 1. Draw weapons with onTop === false (underneath hull)
  for (const w of weaponDrawList) {
    if (!w.onTop) {
      ctx.drawImage(w.img, w.x + offsetX, w.y + offsetY);
    }
  }

  // 2. Draw hull image at (offsetX, offsetY)
  ctx.drawImage(hullImg, offsetX, offsetY);

  // Replace exact matching red pixels (RGB: 212, 33, 33) with the selected paint color
  const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imgData.data;
  const targetR = 212;
  const targetG = 33;
  const targetB = 33;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === targetR && data[i + 1] === targetG && data[i + 2] === targetB && data[i + 3] === 255) {
      data[i] = paintColor.r;
      data[i + 1] = paintColor.g;
      data[i + 2] = paintColor.b;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Draw static engine on top at mount position
  ctx.drawImage(engineImg, ex + offsetX, ey + offsetY);

  // 4. Draw weapons with onTop === true (on top of hull and engine)
  for (const w of weaponDrawList) {
    if (w.onTop) {
      ctx.drawImage(w.img, w.x + offsetX, w.y + offsetY);
    }
  }

  const texture = PIXI.Texture.from(canvas);
  const result = { texture, offsetX, offsetY, canvas };
  bakedTextureCache.set(cacheKey, result);
  return result;
}

let nextShipId = 1;

function buildShip(hullChoice, engineChoice, paintChoice, weaponsChoice) {
  const newShip = new PIXI.Container();
  const hull = hullChoice || randomChoice(HULLS_DATA);
  const engineData = engineChoice || randomChoice(ENGINES_DATA);
  const paintColor = paintChoice || randomChoice(FACTION_PAINTS);

  // Default weapon setup: Light Blaster attached to each hardpoint on the hull
  const weapons = weaponsChoice || hull.hardpoints.map((hp) => ({
    weapon: WEAPONS_DATA.light_blaster,
    hardpoint: hp,
    lastFired: -Infinity,
  }));

  // Bake static components (body + engine + weapons with custom paint color) into a single image texture
  const baked = getBakedShipTexture(hull, engineData, paintColor, weapons);
  const staticSprite = new PIXI.Sprite(baked.texture);
  staticSprite.position.set(-baked.offsetX, -baked.offsetY);
  newShip.addChild(staticSprite);
  newShip.pivot.set(hull.pivot.x, hull.pivot.y);

  let engineLit = new PIXI.Sprite(
    PIXI.Assets.get(engineData.imgLit)
  );
  engineLit.pivot.set(engineData.pivot.x, engineData.pivot.y);
  engineLit.position.set(hull.engine_mount.x, hull.engine_mount.y);
  newShip.addChild(engineLit);
  engineLit.visible = false;

  let engineReverse = null;
  if (engineData.reversible) {
    engineReverse = new PIXI.Sprite(
      PIXI.Assets.get(engineData.imgReverse)
    );
    engineReverse.pivot.set(engineData.pivot.x, engineData.pivot.y);
    engineReverse.position.set(hull.engine_mount.x, hull.engine_mount.y);
    newShip.addChild(engineReverse);
    engineReverse.visible = false;
  }

  const accel = (engineData.thrust * 1000) / (hull.mass + engineData.mass); // m/s/s
  const maxSpeed = accel * ACCEL_LIMIT; // px/s
  const timeToTurnAround = Math.PI / (TURN_RATE * 60); // seconds to turn 180 degrees
  const distanceRequiredToStop = (maxSpeed * maxSpeed) / (2 * accel); // px
  const stoppingDistance = (maxSpeed * timeToTurnAround) + distanceRequiredToStop; // px

  const newData = {
    id: nextShipId++,
    vx: 0,
    vy: 0,
    accel,
    maxSpeed,
    timeToTurnAround,
    distanceRequiredToStop,
    stoppingDistance,
    shield: 10,
    maxShield: 10,
    shieldRegenRate: DEFAULT_SHIELD_REGEN_RATE,
    hullHealth: 10,
    maxHullHealth: 10,
    armor: 10,
    maxArmor: 10,
    shieldHitTimer: 0,
    shieldDownDelay: 0,
    isDisabled: false,
    isDestroyed: false,
    energy: 100,
    maxEnergy: 100,
    jumpFuel: 3,
    maxJumpFuel: 3,
    hull,
    engine: engineData,
    paint: paintColor,
    weapons,
    staticSprite,
    engineLitSprite: engineLit,
    engineReverseSprite: engineReverse,
    bakedCanvas: baked.canvas,
    bakedOffsetX: baked.offsetX,
    bakedOffsetY: baked.offsetY,
    aiState: 'APPROACH',
    combatStrategy: null,
    combatTarget: null,
    isRetreating: false,
    formationLeader: null,
    formationSlot: null,
    formationOffset: { x: 0, y: FORMATION_DISTANCE },
  };

  return { sprite: newShip, data: newData };
}

// Hexagonal Grid and Fleet Formation System
const HEX_DIRECTIONS = [
  { q: 1, r: 0, s: -1 },
  { q: 1, r: -1, s: 0 },
  { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 },
  { q: -1, r: 1, s: 0 },
  { q: 0, r: 1, s: -1 },
];

function getHexRing(radius) {
  const results = [];
  let hex = {
    q: HEX_DIRECTIONS[4].q * radius,
    r: HEX_DIRECTIONS[4].r * radius,
    s: HEX_DIRECTIONS[4].s * radius,
  };
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push({ q: hex.q, r: hex.r, s: hex.s });
      hex.q += HEX_DIRECTIONS[i].q;
      hex.r += HEX_DIRECTIONS[i].r;
      hex.s += HEX_DIRECTIONS[i].s;
    }
  }
  return results;
}

function hexToPixel(q, r, spacing = FORMATION_DISTANCE) {
  return {
    x: spacing * (q + r / 2),
    y: spacing * (r * Math.sqrt(3) / 2),
  };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

/**
 * Calculates an arbitrary ordering of hexagonal grid positions around the formation leader.
 * Concentric rings expand outward so the fleet remains cohesive, while positions within each
 * ring are arranged in an arbitrary ordering calculated at fleet formation time.
 */
function calculateArbitraryFormationOrdering(count, spacing = FORMATION_DISTANCE) {
  const slots = [];
  let ringRadius = 1;
  while (slots.length < count) {
    const ringHexes = getHexRing(ringRadius);
    const ringSlots = ringHexes.map((h) => ({
      q: h.q,
      r: h.r,
      ring: ringRadius,
      ...hexToPixel(h.q, h.r, spacing),
    }));

    // Arbitrary ordering: shuffle positions within each ring
    shuffleArray(ringSlots);

    for (const slot of ringSlots) {
      slots.push(slot);
      if (slots.length === count) break;
    }
    ringRadius++;
  }
  return slots;
}

/**
 * Forms or re-forms the fleet, assigning each follower ship a position relative
 * to the leader based on the calculated arbitrary hexagonal grid ordering.
 */
function formFleet(leader, followerShips, spacing = FORMATION_DISTANCE) {
  if (!followerShips || followerShips.length === 0) return;

  const activeFollowers = followerShips.filter((s) => s && s.data && !s.data.isDestroyed && !s.data.isDisabled);
  if (activeFollowers.length === 0) return;

  const orderedSlots = calculateArbitraryFormationOrdering(activeFollowers.length, spacing);

  for (let i = 0; i < activeFollowers.length; i++) {
    const ship = activeFollowers[i];
    const slot = orderedSlots[i];
    ship.data.formationLeader = leader;
    ship.data.formationSlot = slot;
    ship.data.formationOffset = { x: slot.x, y: slot.y };
  }
}

function getShipMaxWeaponRange(ship) {
  const defaultRange = (typeof WEAPONS_DATA !== 'undefined' && WEAPONS_DATA.light_blaster && WEAPONS_DATA.light_blaster.projectile)
    ? WEAPONS_DATA.light_blaster.projectile.speed * WEAPONS_DATA.light_blaster.projectile.lifetime
    : 87.5;
  if (!ship || !ship.data) return defaultRange;
  let maxRange = 0;
  const forwardSpeed = (ship.sprite && ship.data)
    ? Math.max(0, (ship.data.vx || 0) * Math.sin(ship.sprite.rotation) - (ship.data.vy || 0) * Math.cos(ship.sprite.rotation))
    : 0;
  if (ship.data.weapons && ship.data.weapons.length > 0) {
    for (let i = 0; i < ship.data.weapons.length; i++) {
      const slot = ship.data.weapons[i];
      if (slot && slot.weapon && slot.weapon.projectile) {
        const effectiveSpeed = slot.weapon.projectile.speed + forwardSpeed;
        const r = effectiveSpeed * slot.weapon.projectile.lifetime;
        if (r > maxRange) maxRange = r;
      }
    }
  }
  return maxRange > 0 ? maxRange : defaultRange;
}

function getFleetLeader(ship, allShipsList) {
  if (!ship || !ship.data || !ship.data.paint) return null;
  const myColor = ship.data.paint.name;
  const list = allShipsList || (typeof window !== 'undefined' && window.ships && window.playerShip ? [window.playerShip, ...window.ships] : []);
  let best = null;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (!s || !s.data || s.data.isDestroyed || s.data.isDisabled || s.data.isDerelict) continue;
    if (!s.data.paint || s.data.paint.name !== myColor) continue;
    if (!best || s.data.id < best.data.id) {
      best = s;
    }
  }
  return best;
}

function organizeFleets(allShipsList) {
  const list = allShipsList || (typeof window !== 'undefined' && window.ships && window.playerShip ? [window.playerShip, ...window.ships] : []);
  const activeShips = list.filter((s) => s && s.data && !s.data.isDestroyed && !s.data.isDisabled && !s.data.isDerelict);

  // Group by faction paint color
  const fleetsByColor = new Map();
  for (let i = 0; i < activeShips.length; i++) {
    const s = activeShips[i];
    const color = (s.data.paint && s.data.paint.name) || 'default';
    if (!fleetsByColor.has(color)) {
      fleetsByColor.set(color, []);
    }
    fleetsByColor.get(color).push(s);
  }

  for (const [color, fleet] of fleetsByColor.entries()) {
    fleet.sort((a, b) => a.data.id - b.data.id);
    const leader = fleet[0];
    leader.data.formationLeader = null;
    leader.data.isFleetLeader = true;
    leader.data.formationSlot = null;

    const followers = fleet.slice(1);
    for (let i = 0; i < followers.length; i++) {
      followers[i].data.isFleetLeader = false;
      followers[i].data.formationLeader = leader;
    }
    if (followers.length > 0) {
      formFleet(leader, followers, FORMATION_DISTANCE);
    }
  }
}

const stars = [];
const projectiles = [];
let starContainer = null;
let projectileContainerUnder = null;
let projectileContainerOver = null;

function removeProjectile(proj) {
  if (!proj) return;
  if (proj.container && proj.particle) {
    proj.container.removeParticle(proj.particle);
  } else if (proj.sprite) {
    if (typeof app !== 'undefined' && app && app.stage && typeof app.stage.removeChild === 'function') {
      app.stage.removeChild(proj.sprite);
    }
    if (typeof proj.sprite.destroy === 'function') {
      proj.sprite.destroy();
    }
  }
}

function checkSpeed(vx, vy, speedLimit) {
  const speedSq = vx * vx + vy * vy;
  const limitSq = speedLimit * speedLimit;
  if (speedSq > limitSq && speedSq > 0) {
    const SPEED = Math.sqrt(speedSq);
    const ratio = speedLimit / SPEED;
    return { vx: vx * ratio, vy: vy * ratio };
  }
  return { vx: vx, vy: vy };
}

function applyThrust(ship, delta, accelLimit) {
  const speedLimit = ship.data.accel * accelLimit;
  const dvx = ship.data.accel * delta * (60 / 1000) * Math.sin(ship.sprite.rotation);
  const dvy = ship.data.accel * delta * (60 / 1000) * Math.cos(ship.sprite.rotation);
  const vx = ship.data.vx + dvx;
  const vy = ship.data.vy - dvy;

  return checkSpeed(vx, vy, speedLimit);
}

function applyReverseThrust(ship, delta, accelLimit) {
  const speedLimit = ship.data.accel * accelLimit;
  const dvx = ship.data.accel * delta * (60 / 1000) * Math.sin(ship.sprite.rotation);
  const dvy = ship.data.accel * delta * (60 / 1000) * Math.cos(ship.sprite.rotation);
  const vx = ship.data.vx - dvx;
  const vy = ship.data.vy + dvy;

  return checkSpeed(vx, vy, speedLimit);
}

function spawnProjectile(ship, weaponSlot) {
  const weapon = weaponSlot.weapon;
  const hardpoint = weaponSlot.hardpoint;
  const projData = weapon.projectile;

  // Local coordinates of the projectile origin relative to hull (0, 0)
  const localX = hardpoint.location.x - weapon.attachmentPoint.x + weapon.projectileOrigin.x;
  const localY = hardpoint.location.y - weapon.attachmentPoint.y + weapon.projectileOrigin.y;

  // Transform local point to world/stage coordinates
  const rotation = ship.sprite.rotation;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const relX = localX - ship.sprite.pivot.x;
  const relY = localY - ship.sprite.pivot.y;
  const spawnX = ship.sprite.x + (relX * cos - relY * sin);
  const spawnY = ship.sprite.y + (relX * sin + relY * cos);

  // Velocity: parent ship velocity + weapon velocity in facing direction
  const muzzleSpeed = projData.speed;
  const dirX = Math.sin(rotation);
  const dirY = -Math.cos(rotation);
  const vx = ship.data.vx + muzzleSpeed * dirX;
  const vy = ship.data.vy + muzzleSpeed * dirY;

  const spinSpeed = projData.rotation !== undefined ? projData.rotation : (projData.rotationSpeed !== undefined ? projData.rotationSpeed : 0.1);
  const texture = (typeof PIXI !== 'undefined' && PIXI.Assets && typeof PIXI.Assets.get === 'function') ? PIXI.Assets.get(projData.img) : null;
  const hasParticleSupport = typeof PIXI !== 'undefined' && typeof PIXI.ParticleContainer === 'function' && typeof PIXI.Particle === 'function';
  const targetContainer = hardpoint.onTop ? projectileContainerOver : projectileContainerUnder;

  if (hasParticleSupport && targetContainer) {
    const texW = (texture && texture.width) ? texture.width : 3;
    const texH = (texture && texture.height) ? texture.height : 3;
    const anchorX = projData.pivot ? (projData.pivot.x / texW) : 0.5;
    const anchorY = projData.pivot ? (projData.pivot.y / texH) : 0.5;

    const particle = new PIXI.Particle({
      texture: texture,
      x: spawnX,
      y: spawnY,
      rotation: rotation,
      anchorX: anchorX,
      anchorY: anchorY,
    });

    targetContainer.addParticle(particle);

    projectiles.push({
      particle,
      sprite: particle,
      container: targetContainer,
      vx,
      vy,
      rotation: spinSpeed,
      rotationSpeed: spinSpeed,
      shipId: ship.data.id,
      parentShip: ship,
      ship: ship,
      parent: ship,
      originTime: performance.now(),
      lifetime: projData.lifetime,
      damage: projData.damage !== undefined ? projData.damage : 1,
    });
  } else {
    // Fallback if ParticleContainer is unavailable (e.g. headless unit tests)
    const sprite = (typeof PIXI !== 'undefined' && typeof PIXI.Sprite === 'function') ? new PIXI.Sprite(texture) : { x: spawnX, y: spawnY, rotation };
    if (sprite.pivot && typeof sprite.pivot.set === 'function') {
      sprite.pivot.set(projData.pivot.x, projData.pivot.y);
    }
    if (sprite.position && typeof sprite.position.set === 'function') {
      sprite.position.set(spawnX, spawnY);
    } else {
      sprite.x = spawnX;
      sprite.y = spawnY;
    }
    sprite.rotation = rotation;

    if (typeof app !== 'undefined' && app && app.stage) {
      const shipIndex = typeof app.stage.getChildIndex === 'function' ? app.stage.getChildIndex(ship.sprite) : -1;
      if (shipIndex !== -1 && typeof app.stage.addChildAt === 'function') {
        if (hardpoint.onTop) {
          app.stage.addChildAt(sprite, shipIndex + 1);
        } else {
          app.stage.addChildAt(sprite, shipIndex);
        }
      } else if (typeof app.stage.addChild === 'function') {
        app.stage.addChild(sprite);
      }
    }

    projectiles.push({
      sprite,
      particle: sprite,
      container: null,
      vx,
      vy,
      rotation: spinSpeed,
      rotationSpeed: spinSpeed,
      shipId: ship.data.id,
      parentShip: ship,
      ship: ship,
      parent: ship,
      originTime: performance.now(),
      lifetime: projData.lifetime,
      damage: projData.damage !== undefined ? projData.damage : 1,
    });
  }
}

function getShipWeaponGroups(ship) {
  if (!ship.data.weapons || ship.data.weapons.length === 0) return [];
  if (ship.data.weaponGroups && ship.data._weaponsRef === ship.data.weapons) {
    return ship.data.weaponGroups;
  }

  const groupMap = new Map();
  for (const slot of ship.data.weapons) {
    const key = slot.weapon.name || slot.weapon.img;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        weapon: slot.weapon,
        slots: [],
        lastFired: -Infinity,
        nextIndex: 0,
      });
    }
    groupMap.get(key).slots.push(slot);
  }

  ship.data.weaponGroups = Array.from(groupMap.values());
  ship.data._weaponsRef = ship.data.weapons;
  return ship.data.weaponGroups;
}

function fireShipWeapons(ship) {
  const now = performance.now();
  const groups = getShipWeaponGroups(ship);
  if (!groups || groups.length === 0) return;

  for (const group of groups) {
    const count = group.slots.length;
    if (count === 0) continue;

    const cooldownMs = 1000 / group.weapon.fireRate;
    const staggerInterval = cooldownMs / count;

    // If the weapon group has been idle for at least a full weapon cooldown,
    // reset to the first weapon so it fires immediately upon engaging weapons.
    if (now - group.lastFired >= cooldownMs) {
      group.nextIndex = 0;
    }

    // Check if the stagger interval has passed since the group last fired
    if (now - group.lastFired >= staggerInterval) {
      const slot = group.slots[group.nextIndex];
      // Verify that this individual weapon slot has cooled down
      if (now - slot.lastFired >= cooldownMs) {
        slot.lastFired = now;
        group.lastFired = now;
        group.nextIndex = (group.nextIndex + 1) % count;
        spawnProjectile(ship, slot);
      }
    }
  }
}

function setup() {
  const numberOfStars = 20;
  const hasParticleSupport = typeof PIXI !== 'undefined' && typeof PIXI.ParticleContainer === 'function' && typeof PIXI.Particle === 'function';
  const starTexture = (typeof PIXI !== 'undefined' && PIXI.Assets && typeof PIXI.Assets.get === 'function') ? PIXI.Assets.get("img/stars/Star.png") : null;

  if (hasParticleSupport) {
    starContainer = new PIXI.ParticleContainer({
      texture: starTexture,
      dynamicProperties: {
        position: true,
        rotation: false,
        vertex: false,
        uvs: false,
        color: false,
      }
    });
    app.stage.addChild(starContainer);

    for (let i = 0; i < numberOfStars; i++) {
      let x = randomInt(0 - OFFSCREEN, GAME_WIDTH + OFFSCREEN);
      let y = randomInt(0 - OFFSCREEN, GAME_HEIGHT + OFFSCREEN);

      const star = new PIXI.Particle({
        texture: starTexture,
        x: x,
        y: y,
        anchorX: 0.5,
        anchorY: 0.5,
      });
      star.distanceMod = Math.random() / 5 + 0.75;

      stars.push(star);
      starContainer.addParticle(star);
    }

    // Projectile container underneath ships (for hardpoints with onTop = false)
    projectileContainerUnder = new PIXI.ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        vertex: false,
        uvs: false,
        color: false,
      }
    });
    app.stage.addChild(projectileContainerUnder);
  } else {
    for (let i = 0; i < numberOfStars; i++) {
      let star = (typeof PIXI !== 'undefined' && typeof PIXI.Sprite === 'function') ? new PIXI.Sprite(starTexture) : { x: 0, y: 0 };
      let x = randomInt(0 - OFFSCREEN, GAME_WIDTH + OFFSCREEN);
      let y = randomInt(0 - OFFSCREEN, GAME_HEIGHT + OFFSCREEN);

      star.x = x;
      star.y = y;
      star.distanceMod = Math.random() / 5 + 0.75;

      stars.push(star);
      if (app && app.stage && typeof app.stage.addChild === 'function') {
        app.stage.addChild(star);
      }
    }
  }

  // Player ship starts with the default Crimson Vanguard paint and default blaster
  const playerShip = buildShip(null, null, FACTION_PAINTS[0]);
  playerShip.sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  app.stage.addChild(playerShip.sprite);

  let isFighting = false;
  let isGodMode = false;
  let prevStatusKey = null;

  function updatePlayerStatusUI() {
    if (!playerShip || !playerShip.data) return;

    const data = playerShip.data;
    const currentFuel = Math.max(0, Math.round(data.jumpFuel != null ? data.jumpFuel : 3));
    const maxFuel = Math.max(1, Math.round(data.maxJumpFuel != null ? data.maxJumpFuel : 3));

    const maxShield = Math.max(1, Math.round(data.maxShield != null ? data.maxShield : 10));
    const currentShield = Math.max(0, Math.min(maxShield, data.shield != null ? data.shield : maxShield));
    const shieldPct = Math.max(0, Math.min(100, (currentShield / maxShield) * 100));

    const maxArmor = Math.max(1, Math.round(data.maxHullHealth != null ? data.maxHullHealth : (data.maxArmor != null ? data.maxArmor : 10)));
    const currentArmor = Math.max(0, Math.min(maxArmor, data.hullHealth != null ? data.hullHealth : (data.armor != null ? data.armor : maxArmor)));
    const armorPct = Math.max(0, Math.min(100, (currentArmor / maxArmor) * 100));

    const maxEnergy = Math.max(1, Math.round(data.maxEnergy != null ? data.maxEnergy : 100));
    const currentEnergy = Math.max(0, Math.min(maxEnergy, data.energy != null ? data.energy : 100));
    const energyPct = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));

    const hullName = data.hull ? data.hull.name : '';
    const engineName = data.engine ? data.engine.name : '';
    const maxSpeed = Math.round(data.maxSpeed || 0);

    const statusKey = `${Math.ceil(currentShield)}_${shieldPct.toFixed(1)}_${Math.ceil(currentArmor)}_${armorPct.toFixed(1)}_${Math.round(currentEnergy)}_${currentFuel}_${maxFuel}_${hullName}_${engineName}_${maxSpeed}_${isGodMode}`;
    if (statusKey === prevStatusKey) return;
    prevStatusKey = statusKey;

    // Shield
    if (shieldVal) shieldVal.textContent = `${Math.ceil(currentShield)} / ${maxShield}`;
    if (shieldBar) shieldBar.style.width = `${shieldPct}%`;

    // Armor
    if (armorVal) armorVal.textContent = `${Math.ceil(currentArmor)} / ${maxArmor}`;
    if (armorBar) armorBar.style.width = `${armorPct}%`;

    // Energy
    if (energyVal) energyVal.textContent = `${Math.round(currentEnergy)}%`;
    if (energyBar) energyBar.style.width = `${energyPct}%`;

    // Jump Fuel (Segmented)
    if (fuelVal) fuelVal.textContent = `${currentFuel} / ${maxFuel}`;
    if (fuelSegmentsContainer) {
      fuelSegmentsContainer.innerHTML = '';
      for (let i = 0; i < maxFuel; i++) {
        const seg = document.createElement('div');
        seg.className = i < currentFuel ? 'fuel-segment filled' : 'fuel-segment empty';
        fuelSegmentsContainer.appendChild(seg);
      }
    }

    // Ship Specs
    if (statusHullName && data.hull) statusHullName.textContent = data.hull.name;
    if (statusEngineName && data.engine) {
      statusEngineName.textContent = data.engine.name === 'turbo_thruster' ? 'Turbo Thruster' : 'Std Thruster';
    }
    if (statusSpeedVal) statusSpeedVal.textContent = `${maxSpeed} px/s`;
    if (statusMassVal && data.hull && data.engine) {
      const totalMass = data.hull.mass + data.engine.mass;
      statusMassVal.textContent = `${totalMass.toLocaleString()} kg`;
    }

    const playerStatusBadge = document.getElementById("player-status-badge");
    if (playerStatusBadge) {
      if (isGodMode) {
        playerStatusBadge.textContent = 'GOD MODE';
        playerStatusBadge.className = 'status-badge status-warning';
      } else if (data.isDestroyed) {
        playerStatusBadge.textContent = 'DESTROYED';
        playerStatusBadge.className = 'status-badge status-critical';
      } else if (data.isDisabled) {
        playerStatusBadge.textContent = 'DISABLED';
        playerStatusBadge.className = 'status-badge status-critical';
      } else if (currentShield === 0) {
        playerStatusBadge.textContent = 'SHIELD DOWN';
        playerStatusBadge.className = 'status-badge status-warning';
      } else {
        playerStatusBadge.textContent = 'NOMINAL';
        playerStatusBadge.className = 'status-badge';
      }
    }
  }

  // Derelict test ship that simply floats in place and does nothing
  const derelictHull = HULLS_DATA.find((h) => h.name === 'Boat') || randomChoice(HULLS_DATA);
  const derelictEngine = ENGINES_DATA[0];
  const derelictPaint = FACTION_PAINTS[3]; // Solaris Guild (Gold)
  let derelictShip = buildShip(derelictHull, derelictEngine, derelictPaint);
  derelictShip.data.isDerelict = true;
  derelictShip.data.aiState = 'DERELICT';
  derelictShip.data.vx = 0;
  derelictShip.data.vy = 0;
  derelictShip.sprite.position.set(GAME_WIDTH / 2 + 250, GAME_HEIGHT / 2 - 160);
  derelictShip.sprite.rotation = Math.PI / 4;
  app.stage.addChild(derelictShip.sprite);

  if (derelictLegendDot) {
    derelictLegendDot.style.background = derelictPaint.hex;
  }
  if (playerLegendDot) {
    playerLegendDot.style.background = playerShip.data.paint.hex;
  }

  // Initial update for player status display
  updatePlayerStatusUI();

  const ships = [];

  if (hasParticleSupport) {
    // Projectile container over ships (for hardpoints with onTop = true)
    projectileContainerOver = new PIXI.ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        vertex: false,
        uvs: false,
        color: false,
      }
    });
    app.stage.addChild(projectileContainerOver);
  }

  // Shield impact bubble graphics in the main view
  const shieldGraphics = new PIXI.Graphics();
  app.stage.addChild(shieldGraphics);

  // Tactical targeting bracket graphics in the main view
  const targetBracketGraphics = new PIXI.Graphics();
  app.stage.addChild(targetBracketGraphics);

  // Hull hitbox overlay graphics in the main view
  const hitboxGraphics = new PIXI.Graphics();
  app.stage.addChild(hitboxGraphics);

  // Ship pivot overlay graphics in the main view
  const pivotGraphics = new PIXI.Graphics();
  app.stage.addChild(pivotGraphics);

  function regenerateShields(dtSec) {
    const allShips = [playerShip, derelictShip, ...ships];
    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      if (!s || !s.data || s.data.isDestroyed || s.data.isDisabled) continue;
      const maxS = s.data.maxShield || 10;

      // Delay recharging by 1 second after shields go down
      if (s.data.shieldDownDelay > 0) {
        s.data.shieldDownDelay = Math.max(0, s.data.shieldDownDelay - dtSec);
        continue;
      }

      if (s.data.shield < maxS) {
        const rate = (s.data.shieldRegenRate != null) ? s.data.shieldRegenRate : DEFAULT_SHIELD_REGEN_RATE;
        s.data.shield = Math.min(maxS, s.data.shield + dtSec * rate);
      }
    }
  }

  function updateShieldEffects(dtSec) {
    if (!shieldGraphics) return;
    shieldGraphics.clear();
    const allShips = [playerShip, derelictShip, ...ships];
    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      if (!s || !s.sprite || !s.data || s.data.isDestroyed) continue;
      if (s.data.shieldHitTimer > 0) {
        s.data.shieldHitTimer = Math.max(0, s.data.shieldHitTimer - dtSec);
        const r = (s.data.hull && s.data.hull.shieldRadius) ? s.data.hull.shieldRadius : 20;

        // Offscreen culling: skip drawing shield graphics if outside viewport
        if (s.sprite.x + r < 0 || s.sprite.x - r > GAME_WIDTH || s.sprite.y + r < 0 || s.sprite.y - r > GAME_HEIGHT) {
          continue;
        }

        const alpha = Math.min(1, s.data.shieldHitTimer / 0.25);
        shieldGraphics.circle(s.sprite.x, s.sprite.y, r);
        shieldGraphics.fill({ color: 0x38bdf8, alpha: 0.22 * alpha });
        shieldGraphics.stroke({ width: 2, color: 0x38bdf8, alpha: 0.85 * alpha });
      }
    }
  }

  function updateHitboxGraphics() {
    if (!hitboxGraphics) return;
    hitboxGraphics.clear();
    if (!showHitboxes) return;

    const allShips = [playerShip, derelictShip, ...ships];
    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      if (!s || !s.sprite || !s.data || s.data.isDestroyed) continue;

      const r = (s.data.hull && s.data.hull.hullRadius) ? s.data.hull.hullRadius : 6;

      // Offscreen culling: skip drawing if outside viewport
      if (s.sprite.x + r < 0 || s.sprite.x - r > GAME_WIDTH || s.sprite.y + r < 0 || s.sprite.y - r > GAME_HEIGHT) {
        continue;
      }

      hitboxGraphics.circle(s.sprite.x, s.sprite.y, r);
      hitboxGraphics.fill({ color: 0xef4444, alpha: 0.3 });
      hitboxGraphics.stroke({ width: 1.5, color: 0xef4444, alpha: 0.9 });
    }
  }

  function updatePivotGraphics() {
    if (!pivotGraphics) return;
    pivotGraphics.clear();
    if (!showPivots) return;

    const allShips = [playerShip, derelictShip, ...ships];
    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      if (!s || !s.sprite || !s.data || s.data.isDestroyed) continue;

      const px = Math.round(s.sprite.x);
      const py = Math.round(s.sprite.y);

      // Offscreen culling: skip drawing if outside viewport
      if (px + PIVOT_HALF < 0 || px - PIVOT_HALF > GAME_WIDTH || py + PIVOT_HALF < 0 || py - PIVOT_HALF > GAME_HEIGHT) {
        continue;
      }

      if (typeof pivotGraphics.rect === 'function') {
        pivotGraphics.rect(px - PIVOT_HALF, py - PIVOT_HALF, PIVOT_SIZE, PIVOT_SIZE);
      } else if (typeof pivotGraphics.drawRect === 'function') {
        pivotGraphics.drawRect(px - PIVOT_HALF, py - PIVOT_HALF, PIVOT_SIZE, PIVOT_SIZE);
      } else {
        pivotGraphics.circle(px, py, PIVOT_SIZE / 2);
      }
      if (typeof pivotGraphics.fill === 'function') {
        pivotGraphics.fill({ color: 0xc084fc, alpha: 1.0 });
      }
    }
  }

  function destroyShip(shipToDestroy) {
    if (!shipToDestroy || !shipToDestroy.data || shipToDestroy.data.isDestroyed) return;
    shipToDestroy.data.isDestroyed = true;
    shipToDestroy.data.isDisabled = true;

    if (shipToDestroy.sprite) {
      if (shipToDestroy.sprite.parent) {
        shipToDestroy.sprite.parent.removeChild(shipToDestroy.sprite);
      }
      if (typeof shipToDestroy.sprite.destroy === 'function') {
        shipToDestroy.sprite.destroy({ children: true });
      }
    }

    if (shipToDestroy === derelictShip) {
      derelictShip = null;
    } else {
      const idx = ships.indexOf(shipToDestroy);
      if (idx !== -1) {
        ships.splice(idx, 1);
      }
    }

    // If current target was destroyed, cycle to the next target
    if (currentTargetId === shipToDestroy.data.id) {
      currentTargetId = null;
      cycleTarget(false);
    }

    updateShipCount();
  }

  function updateShipCount() {
    if (shipCountDisplay) {
      const totalNpc = ships.length + (derelictShip ? 1 : 0);
      shipCountDisplay.textContent = totalNpc.toLocaleString();
    }
  }

  function getRandomCombatStrategy() {
    const rand = Math.random();
    if (rand < 0.333) return 'turn_fight';
    if (rand < 0.666) return 'joust';
    return 'standoff';
  }

  function spawnNpcShips(count) {
    for (let i = 0; i < count; i++) {
      const npc = buildShip();
      npc.sprite.position.set(GAME_WIDTH * Math.random(), GAME_HEIGHT * Math.random());
      if (isFighting) {
        npc.data.combatStrategy = getRandomCombatStrategy();
        npc.data.aiState = 'COMBAT';
      }
      ships.push(npc);
      app.stage.addChild(npc.sprite);
    }
    // Keep over-ship projectile layer, shield bubbles, and targeting bracket HUD overlay on top of all ships
    if (projectileContainerOver) {
      app.stage.addChild(projectileContainerOver);
    }
    app.stage.addChild(shieldGraphics);
    app.stage.addChild(targetBracketGraphics);
    if (hitboxGraphics) {
      app.stage.addChild(hitboxGraphics);
    }
    if (pivotGraphics) {
      app.stage.addChild(pivotGraphics);
    }
    // Form fleets if not in combat mode
    if (!isFighting) {
      organizeFleets([playerShip, ...ships]);
    }
    updateShipCount();
  }

  // Initial NPC ship with a random faction paint job and default blaster
  spawnNpcShips(1);

  if (spawnTenBtn) {
    spawnTenBtn.addEventListener('click', (event) => {
      spawnNpcShips(10);
      event.target.blur();
    });
  }

  if (spawnBtn) {
    spawnBtn.addEventListener('click', (event) => {
      spawnNpcShips(1000);
      event.target.blur();
    });
  }

  const reformBtn = document.getElementById("reform-btn");
  if (reformBtn) {
    reformBtn.addEventListener('click', (event) => {
      isFighting = false;
      if (typeof window !== 'undefined') window.isFighting = isFighting;
      if (fightBtn) fightBtn.classList.remove('active');
      for (const ship of ships) {
        if (ship && ship.data) {
          ship.data.combatStrategy = null;
          ship.data.combatTarget = null;
          ship.data.isRetreating = false;
          ship.data.aiState = 'APPROACH';
        }
      }
      organizeFleets([playerShip, ...ships]);
      event.target.blur();
    });
  }

  if (fightBtn) {
    fightBtn.addEventListener('click', (event) => {
      isFighting = true;
      if (typeof window !== 'undefined') window.isFighting = isFighting;
      fightBtn.classList.add('active');

      const allCombatants = [playerShip, derelictShip, ...ships].filter((s) => s && s.data && !s.data.isDestroyed);
      // Only active fleet ships join the battle; derelict ship does not join and remains motionless
      const activeNpcs = ships.filter((s) => s && s.data && !s.data.isDestroyed && !s.data.isDisabled);

      for (const npc of activeNpcs) {
        if (!npc.data.combatStrategy) {
          npc.data.combatStrategy = getRandomCombatStrategy();
        }
        npc.data.aiState = 'COMBAT';
        npc.data.isRetreating = false;
        npc.data.combatTarget = findNearestHostile(npc, allCombatants);
      }

      if (derelictShip && derelictShip.data) {
        derelictShip.data.isDerelict = true;
        derelictShip.data.aiState = 'DERELICT';
        derelictShip.data.combatStrategy = null;
        derelictShip.data.combatTarget = null;
        derelictShip.data.vx = 0;
        derelictShip.data.vy = 0;
      }

      event.target.blur();
    });
  }

  if (godModeBtn) {
    godModeBtn.addEventListener('click', (event) => {
      isGodMode = !isGodMode;
      if (typeof window !== 'undefined') window.isGodMode = isGodMode;
      if (isGodMode) {
        godModeBtn.textContent = 'God Mode: ON';
        godModeBtn.classList.add('active');
        playerShip.data.shield = playerShip.data.maxShield || 10;
        playerShip.data.hullHealth = playerShip.data.maxHullHealth || 10;
        playerShip.data.armor = playerShip.data.maxArmor || 10;
        playerShip.data.isDisabled = false;
        playerShip.data.isDestroyed = false;
        updatePlayerStatusUI();
      } else {
        godModeBtn.textContent = 'God Mode: OFF';
        godModeBtn.classList.remove('active');
        updatePlayerStatusUI();
      }
      event.target.blur();
    });
  }

  if (hitboxBtn) {
    hitboxBtn.addEventListener('click', (event) => {
      showHitboxes = !showHitboxes;
      if (typeof window !== 'undefined') window.showHitboxes = showHitboxes;
      if (showHitboxes) {
        hitboxBtn.textContent = 'Hitboxes: ON';
        hitboxBtn.classList.add('active');
      } else {
        hitboxBtn.textContent = 'Hitboxes: OFF';
        hitboxBtn.classList.remove('active');
      }
      updateHitboxGraphics();
      event.target.blur();
    });
  }

  if (pivotBtn) {
    pivotBtn.addEventListener('click', (event) => {
      showPivots = !showPivots;
      if (typeof window !== 'undefined') window.showPivots = showPivots;
      if (showPivots) {
        pivotBtn.textContent = 'Pivots: ON';
        pivotBtn.classList.add('active');
      } else {
        pivotBtn.textContent = 'Pivots: OFF';
        pivotBtn.classList.remove('active');
      }
      updatePivotGraphics();
      event.target.blur();
    });
  }

  function findNearestHostile(ship, allCombatants) {
    if (!ship || !ship.data || !ship.data.paint) return null;
    const myColor = ship.data.paint.name;
    let nearestTarget = null;
    let nearestDistSq = Infinity;

    // First pass: active hostile ships (not disabled, not destroyed, and not the motionless derelict)
    for (let i = 0; i < allCombatants.length; i++) {
      const cand = allCombatants[i];
      if (!cand || cand === ship || !cand.data || !cand.sprite || cand.data.isDestroyed || cand.data.isDisabled) continue;
      if (cand.data.isDerelict || cand === derelictShip) continue;
      if (!cand.data.paint || cand.data.paint.name === myColor) continue;

      const dx = cand.sprite.x - ship.sprite.x;
      const dy = cand.sprite.y - ship.sprite.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestTarget = cand;
      }
    }

    // Second pass: if no active enemies, check disabled hostiles (excluding derelict)
    if (!nearestTarget) {
      for (let i = 0; i < allCombatants.length; i++) {
        const cand = allCombatants[i];
        if (!cand || cand === ship || !cand.data || !cand.sprite || cand.data.isDestroyed) continue;
        if (cand.data.isDerelict || cand === derelictShip) continue;
        if (!cand.data.paint || cand.data.paint.name === myColor) continue;

        const dx = cand.sprite.x - ship.sprite.x;
        const dy = cand.sprite.y - ship.sprite.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearestTarget = cand;
        }
      }
    }

    return nearestTarget;
  }

  function getStrategyDisplayName(strategy) {
    if (!strategy) return '';
    const s = String(strategy).toLowerCase().replace(/[^a-z]/g, '');
    if (s.includes('turn')) return 'TURN FIGHT';
    if (s.includes('joust')) return 'JOUSTING';
    if (s.includes('standoff')) return 'STANDOFF';
    return String(strategy).toUpperCase();
  }

  function getLeadSolution(shooter, target, rangeMultiplier = 1.0) {
    const weapon = (shooter.data.weapons && shooter.data.weapons[0] && shooter.data.weapons[0].weapon)
      ? shooter.data.weapons[0].weapon
      : WEAPONS_DATA.light_blaster;
    const speed = weapon.projectile.speed;
    const lifetime = weapon.projectile.lifetime;
    const mult = (rangeMultiplier !== 1.0)
      ? rangeMultiplier
      : (shooter.data && shooter.data.combatStrategy === 'standoff' ? 1.5 : 1.0);

    const fwdX = Math.sin(shooter.sprite.rotation);
    const fwdY = -Math.cos(shooter.sprite.rotation);
    const forwardSpeed = Math.max(0, (shooter.data.vx || 0) * fwdX + (shooter.data.vy || 0) * fwdY);
    const effectiveSpeed = speed + forwardSpeed;
    const maxRange = effectiveSpeed * lifetime * mult;

    const dx = target.sprite.x - shooter.sprite.x;
    const dy = target.sprite.y - shooter.sprite.y;
    const relVx = target.data.vx - shooter.data.vx;
    const relVy = target.data.vy - shooter.data.vy;

    const a = (relVx * relVx + relVy * relVy) - speed * speed;
    const b = 2 * (dx * relVx + dy * relVy);
    const c = dx * dx + dy * dy;

    let t = -1;
    const disc = b * b - 4 * a * c;

    if (Math.abs(a) < 1e-6) {
      if (Math.abs(b) > 1e-6) {
        const root = -c / b;
        if (root > 0) t = root;
      }
    } else if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);

      if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
      else if (t1 > 0) t = t1;
      else if (t2 > 0) t = t2;
    }

    let aimX = dx;
    let aimY = dy;
    let inRange = false;

    if (t > 0) {
      aimX = dx + relVx * t;
      aimY = dy + relVy * t;
      inRange = t <= (lifetime * mult) * (mult > 1.0 ? 1.01 : 1.15);
    } else {
      const distSq = dx * dx + dy * dy;
      // If no valid intercept solution exists (e.g. crossing faster than muzzle speed),
      // only consider in-range at point-blank range (<= 15px) where collision is immediate.
      inRange = distSq <= 15 * 15;
    }

    const aimAngle = Math.atan2(aimX, -aimY);
    return { aimAngle, inRange, interceptTime: t, maxRange };
  }

  function aimAndShoot(ship, target, rangeMultiplier = 1.0) {
    const mult = (rangeMultiplier !== 1.0)
      ? rangeMultiplier
      : (ship.data && ship.data.combatStrategy === 'standoff' ? 1.5 : 1.0);
    const { aimAngle, inRange, interceptTime } = getLeadSolution(ship, target, mult);
    const angleDiff = normalizeAngle(aimAngle - ship.sprite.rotation);

    ship.sprite.rotation = normalizeAngle(ship.sprite.rotation + Math.max(-TURN_RATE, Math.min(TURN_RATE, angleDiff)));

    // Recompute angle difference after turning this frame
    const remainingDiff = Math.abs(normalizeAngle(aimAngle - ship.sprite.rotation));

    // Bias toward firing even if not perfectly aligned (within ~43 degrees / 0.75 rad) to increase hits
    // Only fire if there is a valid ballistic intercept solution (or target is point-blank)
    if (inRange && (interceptTime > 0 || !interceptTime) && (remainingDiff < 0.75 || Math.abs(angleDiff) < 0.75)) {
      fireShipWeapons(ship);
    }
    return { aimAngle, angleDiff, inRange };
  }

  function updateNpcCombat(ship, delta, dt, allCombatants) {
    if (!ship || !ship.data || !ship.sprite || ship.data.isDestroyed) return;
    const shipData = ship.data;
    const shipSprite = ship.sprite;

    const maxA = shipData.maxHullHealth || shipData.maxArmor || 10;
    if (shipData.hullHealth <= maxA * DISABLED_ARMOR_THRESHOLD) {
      shipData.isDisabled = true;
      shipData.aiState = 'DISABLED';
    }

    if (shipData.isDisabled) {
      if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
      if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;

      const damping = Math.pow(0.95, delta);
      shipData.vx *= damping;
      shipData.vy *= damping;
      if (shipData.vx * shipData.vx + shipData.vy * shipData.vy < 0.01) {
        shipData.vx = 0;
        shipData.vy = 0;
      }
      shipSprite.x -= (playerShip.data.vx - shipData.vx) * dt || 0;
      shipSprite.y -= (playerShip.data.vy - shipData.vy) * dt || 0;
      return;
    }

    const maxSpeed = shipData.maxSpeed;
    const accel = shipData.accel;
    const dvMax = accel * dt;

    // Retreat condition: shields fall below 25%
    const maxShield = shipData.maxShield || 10;
    if (shipData.shield >= maxShield * 0.25) {
      shipData.justRendezvoused = false;
    }
    if (!shipData.isRetreating && !shipData.justRendezvoused && shipData.shield < maxShield * 0.25) {
      shipData.isRetreating = true;
    }

    const leader = getFleetLeader(ship, allCombatants);
    const hasSeparateLeader = leader && leader !== ship && !leader.data.isDestroyed && !leader.data.isDisabled;

    // Retreating state: turn to retreat toward lead ship, or flee hostiles if leader
    if (shipData.isRetreating) {
      if (hasSeparateLeader) {
        const ldx = leader.sprite.x - shipSprite.x;
        const ldy = leader.sprite.y - shipSprite.y;
        const distToLeader = Math.sqrt(ldx * ldx + ldy * ldy);
        const maxRange = getShipMaxWeaponRange(ship);
        const rendezvousThreshold = 2 * maxRange;

        // Once they have travelled to rendezvous with it (pass within 2x their maximum weapon range of their leader)
        // they should then target the nearest enemy ship and set off to attack it.
        if (distToLeader <= rendezvousThreshold) {
          shipData.isRetreating = false;
          shipData.justRendezvoused = true;
          shipData.aiState = 'COMBAT';
          shipData.combatTarget = findNearestHostile(ship, allCombatants);
          if (!shipData.combatStrategy) {
            shipData.combatStrategy = getRandomCombatStrategy();
          }
        } else {
          shipData.aiState = 'RETREAT';
          const targetAngle = Math.PI / 2 + Math.atan2(ldy, ldx);
          const angleDiff = normalizeAngle(targetAngle - shipSprite.rotation);
          shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(-TURN_RATE, Math.min(TURN_RATE, angleDiff)));

          if (Math.abs(angleDiff) < 0.5) {
            const step = Math.min(dvMax, accel * dt);
            const fwdX = Math.sin(shipSprite.rotation);
            const fwdY = -Math.cos(shipSprite.rotation);
            const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
            shipData.vx = clamped.vx;
            shipData.vy = clamped.vy;
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
          } else {
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
          }

          shipSprite.x -= (playerShip.data.vx - shipData.vx) * dt || 0;
          shipSprite.y -= (playerShip.data.vy - shipData.vy) * dt || 0;
          return;
        }
      } else {
        // Leader or lone ship: flee away from all hostile ships until shields fully recovered
        if (shipData.shield >= maxShield - 0.01) {
          shipData.isRetreating = false;
          shipData.aiState = 'COMBAT';
          shipData.combatTarget = findNearestHostile(ship, allCombatants);
        } else {
          shipData.aiState = 'RETREAT';
          const myColor = shipData.paint ? shipData.paint.name : null;
          let fleeX = 0;
          let fleeY = 0;
          let hostileCount = 0;

          for (let j = 0; j < allCombatants.length; j++) {
            const other = allCombatants[j];
            if (!other || other === ship || !other.data || !other.sprite || other.data.isDestroyed) continue;
            if (!other.data.paint || other.data.paint.name === myColor) continue;

            const dx = shipSprite.x - other.sprite.x;
            const dy = shipSprite.y - other.sprite.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 0 && distSq < 1500 * 1500) {
              const dist = Math.sqrt(distSq);
              const weight = 1 / Math.max(10, dist);
              fleeX += (dx / dist) * weight;
              fleeY += (dy / dist) * weight;
              hostileCount++;
            }
          }

          if (hostileCount > 0 && (fleeX !== 0 || fleeY !== 0)) {
            const fleeAngle = Math.atan2(fleeX, -fleeY);
            const angleDiff = normalizeAngle(fleeAngle - shipSprite.rotation);
            shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(-TURN_RATE, Math.min(TURN_RATE, angleDiff)));

            if (Math.abs(angleDiff) < 0.5) {
              const step = Math.min(dvMax, accel * dt);
              const fwdX = Math.sin(shipSprite.rotation);
              const fwdY = -Math.cos(shipSprite.rotation);
              const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
              shipData.vx = clamped.vx;
              shipData.vy = clamped.vy;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            } else {
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            }
          } else {
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          }

          shipSprite.x -= (playerShip.data.vx - shipData.vx) * dt || 0;
          shipSprite.y -= (playerShip.data.vy - shipData.vy) * dt || 0;
          return;
        }
      }
    }

    // Acquire or re-validate hostile target
    let target = shipData.combatTarget;
    if (!target || !target.sprite || !target.data || target.data.isDestroyed || (target.data.paint && shipData.paint && target.data.paint.name === shipData.paint.name)) {
      target = findNearestHostile(ship, allCombatants);
      shipData.combatTarget = target;
    }

    if (!target || !target.sprite) {
      if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
      if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
      shipSprite.x -= (playerShip.data.vx - shipData.vx) * dt || 0;
      shipSprite.y -= (playerShip.data.vy - shipData.vy) * dt || 0;
      return;
    }

    if (!shipData.combatStrategy) {
      shipData.combatStrategy = getRandomCombatStrategy();
    }

    const dx = target.sprite.x - shipSprite.x;
    const dy = target.sprite.y - shipSprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const weapon = (shipData.weapons && shipData.weapons[0] && shipData.weapons[0].weapon)
      ? shipData.weapons[0].weapon
      : WEAPONS_DATA.light_blaster;
    const weaponSpeed = weapon.projectile.speed;
    const weaponLifetime = weapon.projectile.lifetime;
    const weaponRange = weaponSpeed * weaponLifetime;

    if (shipData.combatStrategy === 'turn_fight') {
      // === TURN FIGHT STRATEGY ===
      // Reach position behind target at controlled approach speed.
      // Once anywhere behind the target ship, maintain position and shoot at target.
      // If drifting into the front aspect or out of range, turn and thrust to course back behind the target,
      // resuming shooting as soon as back on course.
      const targetRot = target.sprite.rotation;
      const rearX = -Math.sin(targetRot);
      const rearY = Math.cos(targetRot);
      const rearAngle = normalizeAngle(targetRot + Math.PI);

      const standoff = 45;
      const wpX = target.sprite.x + rearX * standoff;
      const wpY = target.sprite.y + rearY * standoff;
      const wpDx = wpX - shipSprite.x;
      const wpDy = wpY - shipSprite.y;
      const wpDist = Math.hypot(wpDx, wpDy);

      const fromTargetX = shipSprite.x - target.sprite.x;
      const fromTargetY = shipSprite.y - target.sprite.y;
      const bearingFromTarget = Math.atan2(fromTargetX, -fromTargetY);
      const coneAngleDiff = Math.abs(normalizeAngle(bearingFromTarget - rearAngle));

      // Expand "in the pocket" angular zone to anywhere behind the target ship (180-degree rear hemisphere, +/- 90 deg)
      const inCone = coneAngleDiff <= Math.PI / 2;
      const inRange = dist <= weaponRange * 1.05 && dist >= 20;
      const inRearPosition = inCone && inRange;

      // Limit how quickly ships approach their target location to give ample time to get in/stay in position
      const MAX_TURN_FIGHT_APPROACH_SPEED = 25; // px/s relative to target
      const approachSpeed = Math.min(MAX_TURN_FIGHT_APPROACH_SPEED, Math.max(0, wpDist * 0.8));
      const desiredVx = target.data.vx + (wpDist > 0 ? (wpDx / wpDist) * approachSpeed : 0);
      const desiredVy = target.data.vy + (wpDist > 0 ? (wpDy / wpDist) * approachSpeed : 0);

      const dvX = desiredVx - shipData.vx;
      const dvY = desiredVy - shipData.vy;
      const dvMag = Math.hypot(dvX, dvY);

      if (inRearPosition) {
        // In position behind target: maintain position and shoot
        aimAndShoot(ship, target);

        const fwdX = Math.sin(shipSprite.rotation);
        const fwdY = -Math.cos(shipSprite.rotation);
        const fwdDv = dvX * fwdX + dvY * fwdY;

        if (fwdDv > 0.5) {
          const step = Math.min(dvMax, fwdDv);
          const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
          shipData.vx = clamped.vx;
          shipData.vy = clamped.vy;
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        } else if (fwdDv < -0.5 && shipData.engine.reversible) {
          const step = Math.min(dvMax, -fwdDv);
          const clamped = checkSpeed(shipData.vx - step * fwdX, shipData.vy - step * fwdY, maxSpeed);
          shipData.vx = clamped.vx;
          shipData.vy = clamped.vy;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = true;
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }
      } else {
        // Outside rear cone or drifted too far:
        // If already on course (velocity error is small), resume shooting while coasting on course
        const onCourse = dvMag <= 8;
        if (onCourse && dist <= weaponRange) {
          aimAndShoot(ship, target);
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        } else {
          // Turn and thrust to put itself on course that passes through the cone
          const courseAngle = Math.atan2(dvX, -dvY);
          const angleDiff = normalizeAngle(courseAngle - shipSprite.rotation);
          shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(-TURN_RATE, Math.min(TURN_RATE, angleDiff)));

          if (Math.abs(angleDiff) < 0.4) {
            const fwdX = Math.sin(shipSprite.rotation);
            const fwdY = -Math.cos(shipSprite.rotation);
            const dvNeeded = dvX * fwdX + dvY * fwdY;
            if (dvNeeded > 0.5) {
              const step = Math.min(dvMax, dvNeeded);
              const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
              shipData.vx = clamped.vx;
              shipData.vy = clamped.vy;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
            } else {
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            }
          } else {
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          }
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;

          // Opportunistic shot if serendipitously aligned while in range
          if (dist <= weaponRange) {
            const { aimAngle, inRange: leadInRange, interceptTime } = getLeadSolution(ship, target);
            const aimDiff = Math.abs(normalizeAngle(aimAngle - shipSprite.rotation));
            if (leadInRange && (interceptTime > 0 || !interceptTime) && aimDiff < 0.75) {
              fireShipWeapons(ship);
            }
          }
        }
      }
    } else if (shipData.combatStrategy === 'standoff') {
      // === STANDOFF STRATEGY ===
      // Focus on managing range between attacker and target near maximum weapon range while shooting as much as possible.
      // Immediately turn and shoot with shot leading, beginning to fire at 1.5x max weapon range.
      // Apply forward thrust if distance starts to drift out of range, just enough to get back in range.
      // Lateral drift is preserved to naturally orbit and maintain range.
      // Ships with reversible thrusters use reverse thrust to tweak range and relative motion to stay near maximum range.
      const fwdX = Math.sin(shipSprite.rotation);
      const fwdY = -Math.cos(shipSprite.rotation);
      const losX = dx / Math.max(1, dist);
      const losY = dy / Math.max(1, dist);
      const dotFwdLOS = fwdX * losX + fwdY * losY;

      const relVx = shipData.vx - target.data.vx;
      const relVy = shipData.vy - target.data.vy;
      const closingSpeed = losX * relVx + losY * relVy;

      // Account for velocity gained by projectiles when firing forward at speed
      const forwardSpeed = Math.max(0, shipData.vx * fwdX + shipData.vy * fwdY);
      const forwardSpeedBoost = Math.max(forwardSpeed, closingSpeed || 0);
      const effectiveWeaponSpeed = weaponSpeed + forwardSpeedBoost;
      const effectiveWeaponRange = effectiveWeaponSpeed * weaponLifetime;

      aimAndShoot(ship, target, 1.5);

      const targetMaxRange = effectiveWeaponRange * 0.92;
      const targetMinRange = effectiveWeaponRange * 0.72;

      if (dist > targetMaxRange) {
        // Distance is drifting out of range or already out of range:
        // Apply forward thrust just enough to get back in range
        const excessDist = dist - targetMaxRange;
        const desiredClosingSpeed = Math.min(maxSpeed * 0.8, Math.max(15, excessDist * 0.6));

        if (closingSpeed < desiredClosingSpeed && dotFwdLOS > 0.4) {
          const neededDv = (desiredClosingSpeed - closingSpeed) / Math.max(0.1, dotFwdLOS);
          if (neededDv > 0.5) {
            const step = Math.min(dvMax, neededDv);
            const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
            shipData.vx = clamped.vx;
            shipData.vy = clamped.vy;
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
          } else {
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
          }
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }
      } else if (shipData.engine && shipData.engine.reversible) {
        // Reversible engine: tweak range and relative motion to stay right near maximum range
        if (dist < targetMinRange) {
          // Inside min range: back off with reverse thrust
          const underDist = targetMinRange - dist;
          const desiredBackoffSpeed = Math.min(maxSpeed * 0.5, Math.max(10, underDist * 0.6));
          if (closingSpeed > -desiredBackoffSpeed && dotFwdLOS > 0.4) {
            const neededReverseDv = (closingSpeed - (-desiredBackoffSpeed)) / Math.max(0.1, dotFwdLOS);
            if (neededReverseDv > 0.5) {
              const step = Math.min(dvMax, neededReverseDv);
              const clamped = checkSpeed(shipData.vx - step * fwdX, shipData.vy - step * fwdY, maxSpeed);
              shipData.vx = clamped.vx;
              shipData.vy = clamped.vy;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = true;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            } else {
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            }
          } else {
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          }
        } else if (closingSpeed > 10 && dotFwdLOS > 0.4) {
          // Within sweet spot, but target is closing rapidly: tweak relative motion to arrest closing speed
          const neededReverseDv = (closingSpeed - 0) / Math.max(0.1, dotFwdLOS);
          if (neededReverseDv > 0.5) {
            const step = Math.min(dvMax, neededReverseDv);
            const clamped = checkSpeed(shipData.vx - step * fwdX, shipData.vy - step * fwdY, maxSpeed);
            shipData.vx = clamped.vx;
            shipData.vy = clamped.vy;
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = true;
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          } else {
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          }
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }
      } else {
        // Non-reversible ship in or under standoff range:
        // Do not forward thrust; allow lateral drift to maintain range and continue shooting
        if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
        if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
      }
    } else {
      // === JOUSTING STRATEGY ===
      // Keep speed up, thrust toward opponent to pass as close as possible at max speed,
      // turn and shoot while in range using shot leading, turn and thrust for next pass once out of range.
      const inRange = dist <= weaponRange * 1.1;
      const relVx = target.data.vx - shipData.vx;
      const relVy = target.data.vy - shipData.vy;
      const radialSpeed = (dx * relVx + dy * relVy) / Math.max(1, dist);
      const isSeparating = radialSpeed > 5 && dist > weaponRange * 0.7;

      if (inRange && !isSeparating) {
        // High speed inbound / passing run: turn and shoot with shot leading
        aimAndShoot(ship, target);

        // Keep speed up
        const curSpeedSq = shipData.vx * shipData.vx + shipData.vy * shipData.vy;
        if (curSpeedSq < (maxSpeed * 0.9) * (maxSpeed * 0.9)) {
          const fwdX = Math.sin(shipSprite.rotation);
          const fwdY = -Math.cos(shipSprite.rotation);
          const step = Math.min(dvMax, accel * dt);
          const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
          shipData.vx = clamped.vx;
          shipData.vy = clamped.vy;
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
        }
        if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
      } else {
        // Out of range or separating: turn and thrust toward opponent for another high speed pass
        const desiredVx = (dx / Math.max(1, dist)) * maxSpeed;
        const desiredVy = (dy / Math.max(1, dist)) * maxSpeed;

        const dvX = desiredVx - shipData.vx;
        const dvY = desiredVy - shipData.vy;

        const courseAngle = Math.atan2(dvX, -dvY);
        const angleDiff = normalizeAngle(courseAngle - shipSprite.rotation);
        shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(-TURN_RATE, Math.min(TURN_RATE, angleDiff)));

        if (Math.abs(angleDiff) < 0.4) {
          const step = Math.min(dvMax, accel * dt);
          const fwdX = Math.sin(shipSprite.rotation);
          const fwdY = -Math.cos(shipSprite.rotation);
          const clamped = checkSpeed(shipData.vx + step * fwdX, shipData.vy + step * fwdY, maxSpeed);
          shipData.vx = clamped.vx;
          shipData.vy = clamped.vy;
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }

        if (inRange) {
          const { aimAngle, inRange: leadInRange, interceptTime } = getLeadSolution(ship, target);
          const aimDiff = Math.abs(normalizeAngle(aimAngle - shipSprite.rotation));
          if (leadInRange && (interceptTime > 0 || !interceptTime) && aimDiff < 0.75) {
            fireShipWeapons(ship);
          }
        }
      }
    }

    const clampedSpeed = checkSpeed(shipData.vx, shipData.vy, maxSpeed);
    shipData.vx = clampedSpeed.vx;
    shipData.vy = clampedSpeed.vy;

    shipSprite.x -= (playerShip.data.vx - shipData.vx) * dt || 0;
    shipSprite.y -= (playerShip.data.vy - shipData.vy) * dt || 0;
  }

  function updatePlayerShipConfig({ hull, engine, paint }) {
    if (hull) {
      playerShip.data.hull = hull;
      // Re-assign default weapons to all hardpoints of the new hull
      playerShip.data.weapons = hull.hardpoints.map((hp) => ({
        weapon: WEAPONS_DATA.light_blaster,
        hardpoint: hp,
        lastFired: -Infinity,
      }));
    }
    if (engine) playerShip.data.engine = engine;
    if (paint) {
      playerShip.data.paint = paint;
      if (playerLegendDot) {
        playerLegendDot.style.background = paint.hex;
      }
    }

    const currentHull = playerShip.data.hull;
    const currentEngine = playerShip.data.engine;
    const currentPaint = playerShip.data.paint;

    // Recalculate acceleration and stopping distance metrics
    playerShip.data.accel = (currentEngine.thrust * 1000) / (currentHull.mass + currentEngine.mass);
    const maxSpeed = playerShip.data.accel * ACCEL_LIMIT;
    const timeToTurnAround = Math.PI / (TURN_RATE * 60);
    const distanceRequiredToStop = (maxSpeed * maxSpeed) / (2 * playerShip.data.accel);
    playerShip.data.maxSpeed = maxSpeed;
    playerShip.data.timeToTurnAround = timeToTurnAround;
    playerShip.data.distanceRequiredToStop = distanceRequiredToStop;
    playerShip.data.stoppingDistance = (maxSpeed * timeToTurnAround) + distanceRequiredToStop;

    // Clamp existing player velocity if switching to an engine with a lower top speed
    const clampedPlayerSpeed = checkSpeed(playerShip.data.vx, playerShip.data.vy, maxSpeed);
    playerShip.data.vx = clampedPlayerSpeed.vx;
    playerShip.data.vy = clampedPlayerSpeed.vy;

    // Update ship container pivot for new hull center
    playerShip.sprite.pivot.set(currentHull.pivot.x, currentHull.pivot.y);

    // Update baked static components (body + engine + paint + weapons)
    const baked = getBakedShipTexture(currentHull, currentEngine, currentPaint, playerShip.data.weapons);
    playerShip.data.staticSprite.texture = baked.texture;
    playerShip.data.staticSprite.position.set(-baked.offsetX, -baked.offsetY);
    playerShip.data.bakedCanvas = baked.canvas;
    playerShip.data.bakedOffsetX = baked.offsetX;
    playerShip.data.bakedOffsetY = baked.offsetY;

    // Update lit flame sprite
    const litTexture = PIXI.Assets.get(currentEngine.imgLit);
    playerShip.data.engineLitSprite.texture = litTexture;
    playerShip.data.engineLitSprite.pivot.set(currentEngine.pivot.x, currentEngine.pivot.y);
    playerShip.data.engineLitSprite.position.set(currentHull.engine_mount.x, currentHull.engine_mount.y);

    // Update reverse thruster flame sprite
    if (currentEngine.reversible) {
      const reverseTexture = PIXI.Assets.get(currentEngine.imgReverse);
      if (!playerShip.data.engineReverseSprite) {
        const revSprite = new PIXI.Sprite(reverseTexture);
        playerShip.sprite.addChild(revSprite);
        playerShip.data.engineReverseSprite = revSprite;
      } else {
        playerShip.data.engineReverseSprite.texture = reverseTexture;
      }
      playerShip.data.engineReverseSprite.pivot.set(currentEngine.pivot.x, currentEngine.pivot.y);
      playerShip.data.engineReverseSprite.position.set(currentHull.engine_mount.x, currentHull.engine_mount.y);
      playerShip.data.engineReverseSprite.visible = false;
    } else {
      if (playerShip.data.engineReverseSprite) {
        playerShip.data.engineReverseSprite.visible = false;
        playerShip.sprite.removeChild(playerShip.data.engineReverseSprite);
        playerShip.data.engineReverseSprite = null;
      }
    }

    updatePlayerStatusUI();
  }

  // Synchronize dropdown controls with player's loadout
  if (bodySelect) {
    bodySelect.value = playerShip.data.hull.name;
    bodySelect.addEventListener('change', (event) => {
      const selectedName = event.target.value;
      const newHull = HULLS_DATA.find((h) => h.name === selectedName);
      if (newHull) {
        updatePlayerShipConfig({ hull: newHull });
      }
      event.target.blur();
    });
  }

  if (engineSelect) {
    engineSelect.value = playerShip.data.engine.name;
    engineSelect.addEventListener('change', (event) => {
      const selectedName = event.target.value;
      const newEngine = ENGINES_DATA.find((e) => e.name === selectedName);
      if (newEngine) {
        updatePlayerShipConfig({ engine: newEngine });
      }
      event.target.blur();
    });
  }

  if (paintSelect) {
    paintSelect.value = playerShip.data.paint.name;
    paintSelect.addEventListener('change', (event) => {
      const selectedName = event.target.value;
      const newPaint = FACTION_PAINTS.find((p) => p.name === selectedName);
      if (newPaint) {
        updatePlayerShipConfig({ paint: newPaint });
        if (!isFighting) {
          organizeFleets([playerShip, ...ships]);
        }
      }
      event.target.blur();
    });
  }

  playerShip.data.vx = 0;
  playerShip.data.vy = 0;

  function getTargetableShips() {
    const list = [];
    if (derelictShip && !derelictShip.data.isDestroyed) list.push(derelictShip);
    for (let i = 0; i < ships.length; i++) {
      if (ships[i] && !ships[i].data.isDestroyed) list.push(ships[i]);
    }
    list.sort((a, b) => a.data.id - b.data.id);
    return list;
  }

  let currentTargetId = derelictShip ? derelictShip.data.id : null;

  function getCurrentTarget() {
    const list = getTargetableShips();
    if (list.length === 0) return null;
    const found = list.find((s) => s.data.id === currentTargetId);
    if (found) return found;
    currentTargetId = list[0].data.id;
    return list[0];
  }

  function cycleTarget(reverse = false) {
    const list = getTargetableShips();
    if (list.length === 0) return;
    const currentIndex = list.findIndex((s) => s.data.id === currentTargetId);
    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = 0;
    } else {
      const step = reverse ? -1 : 1;
      nextIndex = (currentIndex + step + list.length) % list.length;
    }
    currentTargetId = list[nextIndex].data.id;
  }

  onTabPressed = cycleTarget;

  // The X key selects the nearest hostile ship relative to player
  function selectNearestHostile() {
    if (!playerShip) return null;
    const allCombatants = [playerShip, derelictShip, ...ships];
    const nearest = findNearestHostile(playerShip, allCombatants);
    if (nearest && nearest.data) {
      currentTargetId = nearest.data.id;
    }
    return nearest;
  }
  onSelectNearestHostile = selectNearestHostile;

  // When a ship is hit by a projectile, switch its target to the projectile's parent as the most immediate threat
  // (does not apply to player targeting, and only applies to ships from different factions)
  function handleShipHit(targetShip, proj, allShips) {
    if (!targetShip || !targetShip.data || targetShip.data.isDestroyed) return;
    // Retaliatory targeting does not apply to the player
    if (targetShip === playerShip) return;

    const parentShip = proj.parentShip || proj.ship || proj.parent || (allShips && allShips.find((s) => s && s.data && s.data.id === proj.shipId));
    if (!parentShip || parentShip === targetShip || !parentShip.data || parentShip.data.isDestroyed) return;

    // Friendly fire check: retaliatory targeting only applies to ships from different factions
    const targetFaction = targetShip.data.paint ? targetShip.data.paint.name : (targetShip.data.faction || null);
    const parentFaction = parentShip.data.paint ? parentShip.data.paint.name : (parentShip.data.faction || null);
    if (targetFaction && parentFaction && targetFaction === parentFaction) {
      return;
    }

    if (!targetShip.data.isDerelict && !targetShip.data.isDisabled) {
      targetShip.data.combatTarget = parentShip;
      targetShip.data.lastAttacker = parentShip;
      if (isFighting && !targetShip.data.combatStrategy) {
        targetShip.data.combatStrategy = getRandomCombatStrategy();
      }
      if (isFighting && targetShip.data.aiState !== 'RETREAT') {
        targetShip.data.aiState = 'COMBAT';
      }
    }
  }

  // Main screen click targeting: selects closest targetable ship to clicked stage coordinates
  function selectClosestShipToStagePoint(clickX, clickY) {
    const candidateShips = getTargetableShips();
    if (candidateShips.length === 0) return null;

    let closestShip = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < candidateShips.length; i++) {
      const s = candidateShips[i];
      if (!s || !s.sprite || !s.data || s.data.isDestroyed) continue;
      const dx = s.sprite.x - clickX;
      const dy = s.sprite.y - clickY;
      const distSq = dx * dx + dy * dy;

      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestShip = s;
      }
    }

    if (closestShip && closestShip.data) {
      currentTargetId = closestShip.data.id;
    }
    return closestShip;
  }

  function onMainScreenClick(event) {
    if (!app || !app.canvas) return;
    const canvas = app.canvas;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvas.width || GAME_WIDTH, height: canvas.height || GAME_HEIGHT };
    const rectW = rect.width > 0 ? rect.width : (canvas.width || GAME_WIDTH);
    const rectH = rect.height > 0 ? rect.height : (canvas.height || GAME_HEIGHT);
    const scaleX = (canvas.width || GAME_WIDTH) / rectW;
    const scaleY = (canvas.height || GAME_HEIGHT) / rectH;

    let clickX, clickY;
    if (event.clientX != null && rect.left != null) {
      clickX = (event.clientX - rect.left) * scaleX;
      clickY = (event.clientY - rect.top) * scaleY;
    } else if (event.offsetX != null) {
      clickX = event.offsetX * scaleX;
      clickY = event.offsetY * scaleY;
    } else if (event.x != null) {
      clickX = event.x;
      clickY = event.y;
    } else {
      clickX = 0;
      clickY = 0;
    }

    return selectClosestShipToStagePoint(clickX, clickY);
  }

  // Radar screen click targeting: selects ship whose dot is closest to clicked radar coordinates
  function selectClosestShipToRadarPoint(clickX, clickY) {
    const candidateShips = getTargetableShips();
    if (candidateShips.length === 0 || !playerShip) return null;

    let closestShip = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < candidateShips.length; i++) {
      const s = candidateShips[i];
      if (!s || !s.sprite || !s.data || s.data.isDestroyed) continue;
      const pos = getRadarDotPosition(s, playerShip);
      if (!pos) continue;

      const dx = pos.rx - clickX;
      const dy = pos.ry - clickY;
      const distSq = dx * dx + dy * dy;

      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestShip = s;
      }
    }

    if (closestShip && closestShip.data) {
      currentTargetId = closestShip.data.id;
    }
    return closestShip;
  }

  function onRadarScreenClick(event) {
    if (!radarCanvas || !playerShip) return;
    const rect = radarCanvas.getBoundingClientRect ? radarCanvas.getBoundingClientRect() : { left: 0, top: 0, width: radarCanvas.width, height: radarCanvas.height };
    const rectW = rect.width > 0 ? rect.width : radarCanvas.width;
    const rectH = rect.height > 0 ? rect.height : radarCanvas.height;
    const scaleX = radarCanvas.width / rectW;
    const scaleY = radarCanvas.height / rectH;

    let clickX, clickY;
    if (event.clientX != null && rect.left != null) {
      clickX = (event.clientX - rect.left) * scaleX;
      clickY = (event.clientY - rect.top) * scaleY;
    } else if (event.offsetX != null) {
      clickX = event.offsetX * scaleX;
      clickY = event.offsetY * scaleY;
    } else if (event.x != null) {
      clickX = event.x;
      clickY = event.y;
    } else {
      clickX = 0;
      clickY = 0;
    }

    return selectClosestShipToRadarPoint(clickX, clickY);
  }

  if (app && app.canvas) {
    app.canvas.addEventListener('click', onMainScreenClick);
  }
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.addEventListener('click', (event) => {
      if (app && app.canvas && event.target === app.canvas) return;
      onMainScreenClick(event);
    });
  }

  if (radarCanvas) {
    radarCanvas.addEventListener('click', onRadarScreenClick);
  }

  if (typeof window !== 'undefined') {
    window.getTargetableShips = getTargetableShips;
    window.getCurrentTarget = getCurrentTarget;
    window.cycleTarget = cycleTarget;
    window.selectNearestHostile = selectNearestHostile;
    window.selectClosestShipToStagePoint = selectClosestShipToStagePoint;
    window.selectClosestShipToRadarPoint = selectClosestShipToRadarPoint;
    window.onMainScreenClick = onMainScreenClick;
    window.onRadarScreenClick = onRadarScreenClick;
    window.getRadarDotPosition = getRadarDotPosition;
    window.drawTargetView = drawTargetView;
    window.drawRadar = drawRadar;
    window.getRadarRadiusFraction = getRadarRadiusFraction;
    window.RADAR_RINGS = RADAR_RINGS;
    window.RADAR_MAX_DIST = RADAR_MAX_DIST;
    window.gameLoop = gameLoop;
    window.getLeadSolution = getLeadSolution;
    window.aimAndShoot = aimAndShoot;
    window.findNearestHostile = findNearestHostile;
    window.updateNpcCombat = updateNpcCombat;
    window.getStrategyDisplayName = getStrategyDisplayName;
    window.getRandomCombatStrategy = getRandomCombatStrategy;
    window.handleShipHit = handleShipHit;
    Object.defineProperty(window, 'currentTargetId', {
      get: () => currentTargetId,
      set: (val) => { currentTargetId = val; },
      configurable: true,
    });
    Object.defineProperty(window, 'isFighting', {
      get: () => isFighting,
      set: (val) => { isFighting = !!val; },
      configurable: true,
    });
    Object.defineProperty(window, 'isGodMode', {
      get: () => isGodMode,
      set: (val) => { isGodMode = !!val; },
      configurable: true,
    });
    Object.defineProperty(window, 'showHitboxes', {
      get: () => showHitboxes,
      set: (val) => {
        showHitboxes = !!val;
        if (hitboxBtn) {
          hitboxBtn.textContent = `Hitboxes: ${showHitboxes ? 'ON' : 'OFF'}`;
          hitboxBtn.classList.toggle('active', showHitboxes);
        }
        updateHitboxGraphics();
      },
      configurable: true,
    });
    window.hitboxGraphics = hitboxGraphics;
    window.updateHitboxGraphics = updateHitboxGraphics;
    Object.defineProperty(window, 'showPivots', {
      get: () => showPivots,
      set: (val) => {
        showPivots = !!val;
        if (pivotBtn) {
          pivotBtn.textContent = `Pivots: ${showPivots ? 'ON' : 'OFF'}`;
          pivotBtn.classList.toggle('active', showPivots);
        }
        updatePivotGraphics();
      },
      configurable: true,
    });
    window.pivotGraphics = pivotGraphics;
    window.updatePivotGraphics = updatePivotGraphics;
    window.PIVOT_SIZE = PIVOT_SIZE;
    window.DISABLED_ARMOR_THRESHOLD = DISABLED_ARMOR_THRESHOLD;
    window.playerShip = playerShip;
    window.spawnNpcShips = spawnNpcShips;
    window.ships = ships;
    window.derelictShip = derelictShip;
    window.buildShip = buildShip;
    window.organizeFleets = organizeFleets;
    window.getFleetLeader = getFleetLeader;
    window.getShipMaxWeaponRange = getShipMaxWeaponRange;
    window.DEFAULT_SHIELD_REGEN_RATE = DEFAULT_SHIELD_REGEN_RATE;
    window.regenerateShields = regenerateShields;
  }

  if (targetIdBadge) {
    targetIdBadge.addEventListener('click', () => {
      cycleTarget(false);
      targetIdBadge.blur();
    });
  }

  function drawRadar(delta) {
    if (!radarCtx || !radarCanvas || !playerShip) return;

    const width = 220;
    const height = 200;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 86;
    const maxR = radius - 3;

    radarCtx.clearRect(0, 0, width, height);

    // 1. Clip to circular radar scope
    radarCtx.save();
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    radarCtx.fillStyle = '#030814';
    radarCtx.fill();
    radarCtx.clip();

    // 2. Concentric range rings (500m, 1000m, 2000m, 4000m)
    radarCtx.lineWidth = 1;
    for (const ringDist of RADAR_RINGS) {
      const ringFrac = getRadarRadiusFraction(ringDist);
      const ringR = maxR * ringFrac;
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, ringR, 0, Math.PI * 2);
      radarCtx.strokeStyle = ringDist === RADAR_MAX_DIST ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.18)';
      radarCtx.stroke();
    }

    // Range ring text labels (500m, 1km, 2km, 4km)
    radarCtx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    radarCtx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
    radarCtx.textAlign = 'left';
    radarCtx.textBaseline = 'middle';
    const ringLabels = { 500: '500m', 1000: '1km', 2000: '2km', 4000: '4km' };
    for (const ringDist of RADAR_RINGS) {
      const ringFrac = getRadarRadiusFraction(ringDist);
      const ringR = maxR * ringFrac;
      radarCtx.fillText(ringLabels[ringDist], cx + 4, cy - ringR + 5);
    }

    // 3. Crosshairs
    radarCtx.beginPath();
    radarCtx.moveTo(cx - radius, cy);
    radarCtx.lineTo(cx + radius, cy);
    radarCtx.moveTo(cx, cy - radius);
    radarCtx.lineTo(cx, cy + radius);
    radarCtx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    radarCtx.stroke();

    // 4. Subtle screen viewport bounds rectangle
    const vpX = maxR * getRadarRadiusFraction(GAME_WIDTH / 2);
    const vpY = maxR * getRadarRadiusFraction(GAME_HEIGHT / 2);
    radarCtx.beginPath();
    radarCtx.rect(cx - vpX, cy - vpY, vpX * 2, vpY * 2);
    radarCtx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    radarCtx.setLineDash([2, 3]);
    radarCtx.stroke();
    radarCtx.setLineDash([]);

    const currentTarget = getCurrentTarget();

    // Helper to plot a ship on radar
    function plotShipDot(targetShip, isPlayer = false, isDerelict = false) {
      if (!targetShip || !targetShip.sprite || !targetShip.data || targetShip.data.isDestroyed) return;

      let rx = cx;
      let ry = cy;
      const color = (targetShip.data && targetShip.data.paint) ? targetShip.data.paint.hex : '#ffffff';

      if (!isPlayer) {
        const dotPos = getRadarDotPosition(targetShip, playerShip);
        if (dotPos) {
          rx = dotPos.rx;
          ry = dotPos.ry;
        }
      }

      if (isPlayer) {
        // Player dot with heading needle and ring
        radarCtx.fillStyle = color;
        radarCtx.beginPath();
        radarCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        radarCtx.fill();

        radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        radarCtx.lineWidth = 1;
        radarCtx.beginPath();
        radarCtx.arc(cx, cy, 6, 0, Math.PI * 2);
        radarCtx.stroke();

        const heading = playerShip.sprite.rotation;
        radarCtx.beginPath();
        radarCtx.moveTo(cx, cy);
        radarCtx.lineTo(cx + 9 * Math.sin(heading), cy - 9 * Math.cos(heading));
        radarCtx.strokeStyle = color;
        radarCtx.lineWidth = 1.5;
        radarCtx.stroke();
        radarCtx.lineWidth = 1;
      } else if (isDerelict) {
        // Derelict ship: square outline with trim color dot
        radarCtx.fillStyle = color;
        radarCtx.beginPath();
        radarCtx.arc(rx, ry, 3.5, 0, Math.PI * 2);
        radarCtx.fill();

        radarCtx.strokeStyle = color;
        radarCtx.lineWidth = 1;
        radarCtx.strokeRect(rx - 4.5, ry - 4.5, 9, 9);
      } else {
        // Fleet follower ship dot
        radarCtx.fillStyle = color;
        radarCtx.beginPath();
        radarCtx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        radarCtx.fill();
      }

      // Draw tactical targeting bracket if this ship is the current target
      if (!isPlayer && currentTarget && targetShip.data && currentTarget.data && targetShip.data.id === currentTarget.data.id) {
        radarCtx.strokeStyle = '#38bdf8';
        radarCtx.lineWidth = 2;
        const b = 6;
        radarCtx.beginPath();
        // Top-left
        radarCtx.moveTo(rx - b, ry - b + 3);
        radarCtx.lineTo(rx - b, ry - b);
        radarCtx.lineTo(rx - b + 3, ry - b);
        // Top-right
        radarCtx.moveTo(rx + b - 3, ry - b);
        radarCtx.lineTo(rx + b, ry - b);
        radarCtx.lineTo(rx + b, ry - b + 3);
        // Bottom-right
        radarCtx.moveTo(rx + b, ry + b - 3);
        radarCtx.lineTo(rx + b, ry + b);
        radarCtx.lineTo(rx + b - 3, ry + b);
        // Bottom-left
        radarCtx.moveTo(rx - b + 3, ry + b);
        radarCtx.lineTo(rx - b, ry + b);
        radarCtx.lineTo(rx - b, ry + b - 3);
        radarCtx.stroke();
        radarCtx.lineWidth = 1;
      }
    }

    // Draw derelict ship
    if (derelictShip) {
      plotShipDot(derelictShip, false, true);
    }

    // Draw fleet follower ships
    for (let i = 0; i < ships.length; i++) {
      plotShipDot(ships[i], false, false);
    }

    // Draw player ship on top
    plotShipDot(playerShip, true, false);

    radarCtx.restore();

    // Outer border
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    radarCtx.strokeStyle = '#1e3a5f';
    radarCtx.lineWidth = 2;
    radarCtx.stroke();
    radarCtx.lineWidth = 1;
  }

  function drawTargetView() {
    if (!targetCtx || !targetCanvas || !playerShip) return;

    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const cx = width / 2;
    const cy = height / 2;

    targetCtx.clearRect(0, 0, width, height);

    // Background fill
    targetCtx.fillStyle = '#030814';
    targetCtx.fillRect(0, 0, width, height);

    const targetShip = getCurrentTarget();

    // Subtle tactical range rings and grid lines
    targetCtx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    targetCtx.lineWidth = 1;
    targetCtx.setLineDash([2, 4]);

    targetCtx.beginPath();
    targetCtx.arc(cx, cy, 30, 0, Math.PI * 2);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.arc(cx, cy, 60, 0, Math.PI * 2);
    targetCtx.stroke();

    // Crosshairs with center gap
    targetCtx.beginPath();
    targetCtx.moveTo(14, cy);
    targetCtx.lineTo(cx - 20, cy);
    targetCtx.moveTo(cx + 20, cy);
    targetCtx.lineTo(width - 14, cy);

    targetCtx.moveTo(cx, 14);
    targetCtx.lineTo(cx, cy - 20);
    targetCtx.moveTo(cx, cy + 20);
    targetCtx.lineTo(cx, height - 14);
    targetCtx.stroke();
    targetCtx.setLineDash([]);

    // Corner targeting brackets
    const bInset = 14;
    const bLen = 10;
    targetCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    targetCtx.lineWidth = 1.5;
    targetCtx.beginPath();
    // Top-left
    targetCtx.moveTo(bInset, bInset + bLen);
    targetCtx.lineTo(bInset, bInset);
    targetCtx.lineTo(bInset + bLen, bInset);
    // Top-right
    targetCtx.moveTo(width - bInset - bLen, bInset);
    targetCtx.lineTo(width - bInset, bInset);
    targetCtx.lineTo(width - bInset, bInset + bLen);
    // Bottom-right
    targetCtx.moveTo(width - bInset, height - bInset - bLen);
    targetCtx.lineTo(width - bInset, height - bInset);
    targetCtx.lineTo(width - bInset - bLen, height - bInset);
    // Bottom-left
    targetCtx.moveTo(bInset + bLen, height - bInset);
    targetCtx.lineTo(bInset, height - bInset);
    targetCtx.lineTo(bInset, height - bInset - bLen);
    targetCtx.stroke();
    targetCtx.lineWidth = 1;

    if (!targetShip || !targetShip.data || targetShip.data.isDestroyed) {
      targetCtx.fillStyle = '#64748b';
      targetCtx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      targetCtx.textAlign = 'center';
      targetCtx.fillText('NO TARGET ACQUIRED', cx, cy + 4);
      targetCtx.textAlign = 'start';
      if (targetIdBadge) targetIdBadge.textContent = 'NONE';
      if (targetHullVal) targetHullVal.textContent = '--';
      if (targetFactionVal) targetFactionVal.textContent = '--';
      if (targetDistVal) targetDistVal.textContent = '--';
      if (targetStateVal) targetStateVal.textContent = '--';
      if (targetShieldVal) targetShieldVal.textContent = '--';
      if (targetShieldBar) targetShieldBar.style.width = '0%';
      if (targetArmorVal) targetArmorVal.textContent = '--';
      if (targetArmorBar) targetArmorBar.style.width = '0%';
      return;
    }

    // Calculate distance & bearing relative to player
    const dx = targetShip.sprite.x - playerShip.sprite.x;
    const dy = targetShip.sprite.y - playerShip.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bearingRad = Math.atan2(dx, -dy);
    const bearingDeg = Math.round((bearingRad * 180 / Math.PI + 360) % 360);

    // Determine if target is currently offscreen
    const isOffscreen = (
      targetShip.sprite.x < 0 ||
      targetShip.sprite.x > GAME_WIDTH ||
      targetShip.sprite.y < 0 ||
      targetShip.sprite.y > GAME_HEIGHT
    );

    // 1. Draw live target ship (with rotation, weapons, trim color, and thrusters)
    const hull = targetShip.data.hull;
    const engineData = targetShip.data.engine;
    const bakedCanvas = targetShip.data.bakedCanvas;
    const bakedOffsetX = targetShip.data.bakedOffsetX || 0;
    const bakedOffsetY = targetShip.data.bakedOffsetY || 0;

    if (bakedCanvas && hull) {
      targetCtx.save();
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.translate(cx, cy);

      // Camera zoom factor for clear tactical view
      const zoom = 2.2;
      targetCtx.scale(zoom, zoom);
      targetCtx.rotate(targetShip.sprite.rotation);

      // Draw baked static ship
      targetCtx.drawImage(
        bakedCanvas,
        -(hull.pivot.x + bakedOffsetX),
        -(hull.pivot.y + bakedOffsetY)
      );

      // Draw lit thruster flame if active
      if (targetShip.data.engineLitSprite && targetShip.data.engineLitSprite.visible && engineData) {
        const litImg = rawImages[engineData.imgLit];
        if (litImg) {
          targetCtx.drawImage(
            litImg,
            hull.engine_mount.x - hull.pivot.x - engineData.pivot.x,
            hull.engine_mount.y - hull.pivot.y - engineData.pivot.y
          );
        }
      }

      // Draw reverse thruster flame if active
      if (targetShip.data.engineReverseSprite && targetShip.data.engineReverseSprite.visible && engineData) {
        const revImg = rawImages[engineData.imgReverse];
        if (revImg) {
          targetCtx.drawImage(
            revImg,
            hull.engine_mount.x - hull.pivot.x - engineData.pivot.x,
            hull.engine_mount.y - hull.pivot.y - engineData.pivot.y
          );
        }
      }

      // Draw shield impact circle on target monitor if active
      if (targetShip.data.shieldHitTimer > 0) {
        const alpha = Math.min(1, targetShip.data.shieldHitTimer / 0.25);
        const r = (hull && hull.shieldRadius) ? hull.shieldRadius : 20;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, r, 0, Math.PI * 2);
        targetCtx.fillStyle = `rgba(56, 189, 248, ${0.25 * alpha})`;
        targetCtx.strokeStyle = `rgba(56, 189, 248, ${0.85 * alpha})`;
        targetCtx.lineWidth = 2 / zoom;
        targetCtx.fill();
        targetCtx.stroke();
      }

      // Draw hull hitbox circle on target monitor if active
      if (showHitboxes) {
        const hr = (hull && hull.hullRadius) ? hull.hullRadius : 6;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, hr, 0, Math.PI * 2);
        targetCtx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        targetCtx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        targetCtx.lineWidth = 1.5 / zoom;
        targetCtx.fill();
        targetCtx.stroke();
      }

      targetCtx.restore();

      // Draw pivot highlight on target monitor if active
      if (showPivots) {
        targetCtx.fillStyle = '#c084fc';
        targetCtx.fillRect(Math.round(cx) - PIVOT_HALF, Math.round(cy) - PIVOT_HALF, PIVOT_SIZE, PIVOT_SIZE);
      }
    }

    // 2. Tactical OSD overlay
    targetCtx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

    // Sensor feed status
    if (isOffscreen) {
      targetCtx.fillStyle = '#f59e0b';
      targetCtx.fillText('FEED: REMOTE [OFFSCREEN]', 12, 17);
    } else {
      targetCtx.fillStyle = '#4ade80';
      targetCtx.fillText('FEED: DIRECT [OPTICAL]', 12, 17);
    }

    const maxTargetShield = Math.max(1, Math.round(targetShip.data.maxShield != null ? targetShip.data.maxShield : 10));
    const currentTargetShield = Math.max(0, Math.min(maxTargetShield, targetShip.data.shield != null ? targetShip.data.shield : maxTargetShield));
    const targetShieldPct = Math.max(0, Math.min(100, (currentTargetShield / maxTargetShield) * 100));

    const maxTargetArmor = Math.max(1, Math.round(targetShip.data.maxHullHealth != null ? targetShip.data.maxHullHealth : (targetShip.data.maxArmor != null ? targetShip.data.maxArmor : 10)));
    const currentTargetArmor = Math.max(0, Math.min(maxTargetArmor, targetShip.data.hullHealth != null ? targetShip.data.hullHealth : (targetShip.data.armor != null ? targetShip.data.armor : maxTargetArmor)));
    const targetArmorPct = Math.max(0, Math.min(100, (currentTargetArmor / maxTargetArmor) * 100));

    // Lock status & Target Vitals on OSD
    targetCtx.textAlign = 'right';
    if (targetShip.data.isDisabled) {
      targetCtx.fillStyle = '#f87171';
      targetCtx.fillText('TRK: DISABLED', width - 12, 17);
    } else {
      targetCtx.fillStyle = '#38bdf8';
      targetCtx.fillText('TRK: LOCK', width - 12, 17);
    }
    targetCtx.fillStyle = '#38bdf8';
    targetCtx.fillText(`SHD: ${Math.ceil(currentTargetShield)}/${maxTargetShield}`, width - 12, 29);
    targetCtx.fillStyle = '#fbbf24';
    targetCtx.fillText(`ARM: ${Math.ceil(currentTargetArmor)}/${maxTargetArmor}`, width - 12, 41);
    targetCtx.textAlign = 'start';

    // Range & Bearing
    targetCtx.fillStyle = '#94a3b8';
    targetCtx.fillText(`RNG: ${Math.round(dist)}m`, 12, height - 9);
    targetCtx.textAlign = 'right';
    targetCtx.fillText(`BRG: ${bearingDeg.toString().padStart(3, '0')}°`, width - 12, height - 9);
    targetCtx.textAlign = 'start';

    // 3. Update HTML target panel readouts
    if (targetIdBadge) {
      targetIdBadge.textContent = `ID #${targetShip.data.id}`;
    }
    if (targetHullVal) {
      targetHullVal.textContent = hull ? hull.name : 'Unknown';
    }
    if (targetFactionVal) {
      targetFactionVal.textContent = targetShip.data.paint ? (targetShip.data.paint.label || targetShip.data.paint.name) : 'Unknown';
      if (targetShip.data.paint && targetShip.data.paint.hex) {
        targetFactionVal.style.color = targetShip.data.paint.hex;
      }
    }
    if (targetDistVal) {
      targetDistVal.textContent = `${Math.round(dist).toLocaleString()}m`;
    }
    if (targetStateVal) {
      if (targetShip.data.isDestroyed) {
        targetStateVal.textContent = 'DESTROYED';
        targetStateVal.style.color = '#ef4444';
      } else if (targetShip.data.isDisabled) {
        targetStateVal.textContent = 'DISABLED';
        targetStateVal.style.color = '#f87171';
      } else if (targetShip.data.combatStrategy && (isFighting || targetShip.data.aiState === 'COMBAT' || targetShip.data.aiState === 'RETREAT')) {
        const strat = getStrategyDisplayName(targetShip.data.combatStrategy);
        targetStateVal.textContent = strat;
        targetStateVal.style.color = '#38bdf8';
      } else {
        targetStateVal.textContent = targetShip.data.aiState || (targetShip.data.isDerelict ? 'DERELICT' : 'IDLE');
        targetStateVal.style.color = '#e2e8f0';
      }
    }
    if (targetShieldVal) {
      targetShieldVal.textContent = `${Math.ceil(currentTargetShield)} / ${maxTargetShield}`;
    }
    if (targetShieldBar) {
      targetShieldBar.style.width = `${targetShieldPct}%`;
    }
    if (targetArmorVal) {
      targetArmorVal.textContent = `${Math.ceil(currentTargetArmor)} / ${maxTargetArmor}`;
    }
    if (targetArmorBar) {
      targetArmorBar.style.width = `${targetArmorPct}%`;
    }
  }

  function updateTargetBracket() {
    targetBracketGraphics.clear();
    const target = getCurrentTarget();
    if (!target || !target.sprite || target === playerShip || target.data.isDestroyed) {
      return;
    }

    const tx = Math.round(target.sprite.x);
    const ty = Math.round(target.sprite.y);

    // Do not render brackets if the target ship is completely off-screen
    const margin = 50;
    if (tx < -margin || tx > GAME_WIDTH + margin || ty < -margin || ty > GAME_HEIGHT + margin) {
      return;
    }

    // Corner brackets matching the tactical radar display
    const b = 24;
    const arm = 8;

    // Top-left
    targetBracketGraphics.moveTo(tx - b, ty - b + arm);
    targetBracketGraphics.lineTo(tx - b, ty - b);
    targetBracketGraphics.lineTo(tx - b + arm, ty - b);

    // Top-right
    targetBracketGraphics.moveTo(tx + b - arm, ty - b);
    targetBracketGraphics.lineTo(tx + b, ty - b);
    targetBracketGraphics.lineTo(tx + b, ty - b + arm);

    // Bottom-right
    targetBracketGraphics.moveTo(tx + b, ty + b - arm);
    targetBracketGraphics.lineTo(tx + b, ty + b);
    targetBracketGraphics.lineTo(tx + b - arm, ty + b);

    // Bottom-left
    targetBracketGraphics.moveTo(tx - b + arm, ty + b);
    targetBracketGraphics.lineTo(tx - b, ty + b);
    targetBracketGraphics.lineTo(tx - b, ty + b - arm);

    targetBracketGraphics.stroke({ width: 2, color: '#38bdf8' });
  }

  let fpsTimer = 0;

  function gameLoop(delta){
    fpsTimer += delta;
    if (fpsTimer >= 15) {
      fpsTimer = 0;
      if (fpsDisplay && app && app.ticker) {
        const fps = Math.round(app.ticker.FPS);
        fpsDisplay.textContent = fps;
        if (fps >= 50) {
          fpsDisplay.className = 'fps-good';
        } else if (fps >= 30) {
          fpsDisplay.className = 'fps-mid';
        } else {
          fpsDisplay.className = 'fps-low';
        }
      }
    }

    // Check player ship disabled & destroyed state
    if (isGodMode) {
      playerShip.data.isDisabled = false;
      playerShip.data.isDestroyed = false;
      playerShip.data.shield = playerShip.data.maxShield || 10;
      playerShip.data.hullHealth = playerShip.data.maxHullHealth || 10;
      playerShip.data.armor = playerShip.data.maxArmor || 10;
    } else {
      const playerMaxArmor = playerShip.data.maxHullHealth || playerShip.data.maxArmor || 10;
      if (playerShip.data.hullHealth <= playerMaxArmor * DISABLED_ARMOR_THRESHOLD && !playerShip.data.isDestroyed) {
        playerShip.data.isDisabled = true;
        playerShip.data.aiState = 'DISABLED';
      }
    }

    if (playerShip.data.isDisabled || playerShip.data.isDestroyed) {
      if (playerShip.data.engineLitSprite) playerShip.data.engineLitSprite.visible = false;
      if (playerShip.data.engineReverseSprite) playerShip.data.engineReverseSprite.visible = false;

      // Violate Newtonian physics: slowly drift to a stop
      const damping = Math.pow(0.95, delta);
      playerShip.data.vx *= damping;
      playerShip.data.vy *= damping;
      if (playerShip.data.vx * playerShip.data.vx + playerShip.data.vy * playerShip.data.vy < 0.01) {
        playerShip.data.vx = 0;
        playerShip.data.vy = 0;
      }
    } else {
      if (isTurningLeft()) {
        playerShip.sprite.rotation -= TURN_RATE;
      }

      if (isTurningRight()) {
        playerShip.sprite.rotation += TURN_RATE;
      }

      if (isThrusting()) {
        const newSpeed = applyThrust(playerShip, delta, ACCEL_LIMIT);
        playerShip.data.vx = newSpeed.vx;
        playerShip.data.vy = newSpeed.vy;

        if (playerShip.data.engineLitSprite) {
          playerShip.data.engineLitSprite.visible = true;
        }
      } else if (playerShip.data.engineLitSprite && playerShip.data.engineLitSprite.visible) {
        playerShip.data.engineLitSprite.visible = false;
      }

      if (isReversing() && playerShip.data.engine.reversible) {
        const newSpeed = applyReverseThrust(playerShip, delta, ACCEL_LIMIT);
        playerShip.data.vx = newSpeed.vx;
        playerShip.data.vy = newSpeed.vy;

        if (playerShip.data.engineReverseSprite) {
          playerShip.data.engineReverseSprite.visible = true;
        }
      } else if (playerShip.data.engine.reversible && playerShip.data.engineReverseSprite && playerShip.data.engineReverseSprite.visible) {
        playerShip.data.engineReverseSprite.visible = false;
      }

      // Fire weapons when spacebar is engaged
      if (isFiring()) {
        fireShipWeapons(playerShip);
      }
    }

    // Update active projectiles
    const dtSec = delta / 60;

    // Regenerate shields for all active ships at default rate of 0.5 points per second (hulls do not regenerate)
    regenerateShields(dtSec);

    // Update active projectiles and check collisions against active ships
    const now = performance.now();
    const allShips = [playerShip, derelictShip, ...ships];

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      if ((now - proj.originTime) / 1000 >= proj.lifetime) {
        removeProjectile(proj);
        projectiles.splice(i, 1);
        continue;
      }

      const pObj = proj.particle || proj.sprite;
      pObj.x += (proj.vx - playerShip.data.vx) * delta * (60 / 1000);
      pObj.y += (proj.vy - playerShip.data.vy) * delta * (60 / 1000);
      pObj.rotation += (proj.rotation || proj.rotationSpeed || 0) * delta;

      // Hitbox collision check against active ships using distance squared formula
      let hit = false;
      for (let sIdx = 0; sIdx < allShips.length; sIdx++) {
        const targetShip = allShips[sIdx];
        if (!targetShip || !targetShip.sprite || !targetShip.data || targetShip.data.isDestroyed) continue;
        if (targetShip.data.id === proj.shipId) continue; // Do not hit firing ship

        const pdx = pObj.x - targetShip.sprite.x;
        const pdy = pObj.y - targetShip.sprite.y;
        const distSq = pdx * pdx + pdy * pdy;

        const shieldRadius = (targetShip.data.hull && targetShip.data.hull.shieldRadius) ? targetShip.data.hull.shieldRadius : 20;
        const hullRadius = (targetShip.data.hull && targetShip.data.hull.hullRadius) ? targetShip.data.hull.hullRadius : 6;
        const hasShield = targetShip.data.shield > 0;

        if (targetShip === playerShip && isGodMode) {
          if (distSq <= shieldRadius * shieldRadius) {
            targetShip.data.shieldHitTimer = 0.25;
            handleShipHit(targetShip, proj, allShips);
            hit = true;
            break;
          }
          continue;
        }

        if (hasShield) {
          if (distSq <= shieldRadius * shieldRadius) {
            // Collision with outer shield hitbox: trigger shield impact visual effect
            targetShip.data.shieldHitTimer = 0.25;
            handleShipHit(targetShip, proj, allShips);

            if (proj.damage <= targetShip.data.shield) {
              // Shield fully absorbs the projectile damage
              targetShip.data.shield -= proj.damage;
              if (targetShip.data.shield <= 0) {
                targetShip.data.shield = 0;
                targetShip.data.shieldDownDelay = 1.0;
              }
              hit = true;
              break;
            } else {
              // Projectile does more damage than shield can absorb:
              // Partially block: subtract remaining shield strength from projectile damage
              proj.damage -= targetShip.data.shield;
              targetShip.data.shield = 0;
              targetShip.data.shieldDownDelay = 1.0;

              // If projectile has also reached inner hull hitbox in the same frame, impact armor
              if (distSq <= hullRadius * hullRadius) {
                targetShip.data.hullHealth = Math.max(0, targetShip.data.hullHealth - proj.damage);
                targetShip.data.armor = targetShip.data.hullHealth;
                const maxA = targetShip.data.maxHullHealth || targetShip.data.maxArmor || 10;
                if (targetShip.data.hullHealth <= 0) {
                  destroyShip(targetShip);
                } else if (targetShip.data.hullHealth <= maxA * DISABLED_ARMOR_THRESHOLD) {
                  targetShip.data.isDisabled = true;
                  targetShip.data.aiState = 'DISABLED';
                }
                hit = true;
                break;
              }

              // Otherwise projectile continues flying with remaining damage to potentially impact armor
              break;
            }
          }
        } else {
          if (distSq <= hullRadius * hullRadius) {
            // Collision with inner hull hitbox: shields are down, absorb damage into hull
            handleShipHit(targetShip, proj, allShips);
            targetShip.data.hullHealth = Math.max(0, targetShip.data.hullHealth - proj.damage);
            targetShip.data.armor = targetShip.data.hullHealth;
            targetShip.data.shieldDownDelay = 1.0;
            const maxA = targetShip.data.maxHullHealth || targetShip.data.maxArmor || 10;
            if (targetShip.data.hullHealth <= 0) {
              destroyShip(targetShip);
            } else if (targetShip.data.hullHealth <= maxA * DISABLED_ARMOR_THRESHOLD) {
              targetShip.data.isDisabled = true;
              targetShip.data.aiState = 'DISABLED';
            }
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        removeProjectile(proj);
        projectiles.splice(i, 1);
      }
    }

    // Render active shield hit circles
    updateShieldEffects(dtSec);
    // Render hull hitboxes if enabled
    updateHitboxGraphics();
    // Render ship pivots if enabled
    updatePivotGraphics();

    for (let i = ships.length - 1; i >= 0; i--) {
      const ship = ships[i];
      if (!ship || !ship.sprite || !ship.data || ship.data.isDestroyed) continue;
      const shipSprite = ship.sprite;
      const shipData = ship.data;

      // Check if ship is disabled (armor <= 20%)
      const maxA = shipData.maxHullHealth || shipData.maxArmor || 10;
      if (shipData.hullHealth <= maxA * DISABLED_ARMOR_THRESHOLD) {
        shipData.isDisabled = true;
        shipData.aiState = 'DISABLED';
      }

      if (shipData.isDisabled) {
        // Disabled ships turn off thrusters and cannot maneuver
        if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
        if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;

        // Violate Newtonian physics: slowly drift to a stop
        const damping = Math.pow(0.95, delta);
        shipData.vx *= damping;
        shipData.vy *= damping;
        if (shipData.vx * shipData.vx + shipData.vy * shipData.vy < 0.01) {
          shipData.vx = 0;
          shipData.vy = 0;
        }

        // Relative motion tracking with camera
        shipSprite.x -= (playerShip.data.vx - shipData.vx) * delta * (60 / 1000) || 0;
        shipSprite.y -= (playerShip.data.vy - shipData.vy) * delta * (60 / 1000) || 0;
        continue;
      }

      if (isFighting) {
        updateNpcCombat(ship, delta, delta * (60 / 1000), allShips);
        continue;
      }

      // Fleet formation: find designated leader of this color (lowest ID)
      let leader = shipData.formationLeader;
      if (!leader || leader.data.isDestroyed || leader.data.isDisabled) {
        leader = getFleetLeader(ship, allShips);
        shipData.formationLeader = leader;
      }

      // If this ship is the fleet leader (or lone ship), it leads and does not follow in formation
      if (!leader || leader === ship) {
        if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
        if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        shipSprite.x -= (playerShip.data.vx - shipData.vx) * delta * (60 / 1000) || 0;
        shipSprite.y -= (playerShip.data.vy - shipData.vy) * delta * (60 / 1000) || 0;
        continue;
      }

      // Formation offset relative to the formation leader based on the hexagonal grid
      const offset = shipData.formationOffset || { x: 0, y: FORMATION_DISTANCE };
      const targetX = leader.sprite.x + offset.x;
      const targetY = leader.sprite.y + offset.y;

      // Distance and vector from ship to its assigned formation position
      const dx = targetX - shipSprite.x;
      const dy = targetY - shipSprite.y;
      const distSq = dx * dx + dy * dy;

      // Relative velocity: v_npc - v_leader
      const relVx = shipData.vx - leader.data.vx;
      const relVy = shipData.vy - leader.data.vy;
      const relSpeedSq = relVx * relVx + relVy * relVy;
      const relSpeed = Math.sqrt(relSpeedSq);

      const dt = delta * (60 / 1000);
      const dvMax = shipData.accel * dt;
      const matchTolerance = Math.max(1.5, dvMax * 0.8);
      const matchToleranceSq = matchTolerance * matchTolerance;
      const formationRelSpeedTolSq = (matchTolerance * 2.5) * (matchTolerance * 2.5);

      // Stopping distance based on total relative speed and turn time to eliminate drift
      const targetForceAngle = Math.PI / 2 + Math.atan2(-relVy, -relVx);
      const revHeading = normalizeAngle(targetForceAngle + Math.PI);
      const diffForward = Math.abs(normalizeAngle(targetForceAngle - shipSprite.rotation));
      const diffReverse = Math.abs(normalizeAngle(revHeading - shipSprite.rotation));
      const useReverse = shipData.engine.reversible && (diffReverse < diffForward - 0.2);

      const diffAngle = useReverse ? diffReverse : diffForward;
      const turnDist = (diffAngle / TURN_RATE) * dt * relSpeed;
      const stopDist = (relSpeed * relSpeed) / (2 * shipData.accel);
      const currentStopDist = turnDist + stopDist;
      const brakeThreshold = Math.max(18, currentStopDist * 1.05 + 5);
      const brakeThresholdSq = brakeThreshold * brakeThreshold;
      const formationDistSq = 30 * 30; // 900
      const brakeExitThreshold = brakeThreshold * 1.3 + 10;
      const brakeExitThresholdSq = brakeExitThreshold * brakeExitThreshold;

      // Behavior state transitions using distance squared comparisons to avoid square roots
      if (!shipData.aiState) {
        shipData.aiState = distSq > brakeThresholdSq ? 'APPROACH' : 'FORMATION';
      }

      if (shipData.aiState === 'APPROACH') {
        if (distSq <= brakeThresholdSq) {
          shipData.aiState = 'BRAKE';
        }
      } else if (shipData.aiState === 'BRAKE') {
        if (relSpeedSq <= matchToleranceSq) {
          shipData.aiState = distSq <= formationDistSq ? 'FORMATION' : 'APPROACH';
        } else if (distSq > brakeExitThresholdSq) {
          shipData.aiState = 'APPROACH';
        }
      } else if (shipData.aiState === 'FORMATION') {
        // Fall out of formation if displaced from station or relative speed becomes significant
        if (distSq > formationDistSq || relSpeedSq > formationRelSpeedTolSq) {
          shipData.aiState = 'APPROACH';
        }
      }

      // Execute current behavior
      if (shipData.aiState === 'APPROACH') {
        const dist = Math.sqrt(distSq);
        // Safe approach speed scales down with distance and respects maximum turn rate
        // to prevent overrunning the ship's ability to steer toward the destination.
        const turnLimitedSpeed = Math.max(25, dist * (TURN_RATE / dt) * 0.5);
        const safeApproachSpeed = Math.min(
          shipData.maxSpeed,
          Math.sqrt(2 * shipData.accel * Math.max(0, dist - 12)),
          turnLimitedSpeed
        );
        const desiredSpeed = Math.min(shipData.maxSpeed, Math.max(15, safeApproachSpeed));

        const desiredVx = dist > 0 ? (dx / dist) * desiredSpeed : 0;
        const desiredVy = dist > 0 ? (dy / dist) * desiredSpeed : 0;

        // Desired velocity change (delta V) to close distance while actively canceling lateral drift
        const dvX = desiredVx - relVx;
        const dvY = desiredVy - relVy;
        const dvMag = Math.sqrt(dvX * dvX + dvY * dvY);

        if (dvMag > matchTolerance * 0.5) {
          // 1. Turn to face toward the velocity correction vector
          const targetAngle = Math.PI / 2 + Math.atan2(dvY, dvX);
          let angleDiff = normalizeAngle(targetAngle - shipSprite.rotation);
          shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(Math.min(angleDiff, TURN_RATE), -TURN_RATE));

          // 2. Once roughly facing the correction direction, apply forward thrust under own power
          if (Math.abs(angleDiff) < 0.35) {
            const forwardX = Math.sin(shipSprite.rotation);
            const forwardY = -Math.cos(shipSprite.rotation);
            const currentSpeedInDir = shipData.vx * forwardX + shipData.vy * forwardY;
            const targetSpeedInDir = (leader.data.vx + desiredVx) * forwardX + (leader.data.vy + desiredVy) * forwardY;

            if (currentSpeedInDir < targetSpeedInDir) {
              const dvNeeded = targetSpeedInDir - currentSpeedInDir;
              const step = Math.min(dvMax, dvNeeded);
              const clamped = checkSpeed(shipData.vx + step * forwardX, shipData.vy + step * forwardY, shipData.maxSpeed);
              shipData.vx = clamped.vx;
              shipData.vy = clamped.vy;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            } else {
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            }
          } else {
            if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
          }
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }
      } else if (shipData.aiState === 'BRAKE') {
        const targetAngle = useReverse ? revHeading : targetForceAngle;
        let angleDiff = normalizeAngle(targetAngle - shipSprite.rotation);
        shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(Math.min(angleDiff, TURN_RATE), -TURN_RATE));

        if (Math.abs(angleDiff) < 0.35) {
          const heading = shipSprite.rotation;
          const forwardX = Math.sin(heading);
          const forwardY = -Math.cos(heading);

          if (useReverse) {
            // Apply reverse thrust along -forward: throttle down if full frame would overshoot
            const dvNeeded = relVx * forwardX + relVy * forwardY;
            if (dvNeeded > 0) {
              const step = Math.min(dvMax, dvNeeded);
              const clamped = checkSpeed(shipData.vx - step * forwardX, shipData.vy - step * forwardY, shipData.maxSpeed);
              shipData.vx = clamped.vx;
              shipData.vy = clamped.vy;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = true;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            } else {
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
            }
          } else {
            // Apply forward thrust along forward: throttle down if full frame would overshoot
            const dvNeeded = -relVx * forwardX - relVy * forwardY;
            if (dvNeeded > 0) {
              const step = Math.min(dvMax, dvNeeded);
              const clamped = checkSpeed(shipData.vx + step * forwardX, shipData.vy + step * forwardY, shipData.maxSpeed);
              shipData.vx = clamped.vx;
              shipData.vy = clamped.vy;
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            } else {
              if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
              if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
            }
          }
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }
      } else if (shipData.aiState === 'FORMATION') {
        // Matched velocity: turn to face the same direction as the leader to follow their lead
        const targetAngle = leader.sprite.rotation;
        let angleDiff = normalizeAngle(targetAngle - shipSprite.rotation);
        shipSprite.rotation = normalizeAngle(shipSprite.rotation + Math.max(Math.min(angleDiff, TURN_RATE), -TURN_RATE));

        // When flying in formation, ships only maneuver along their physical heading under their own power.
        // If one frame of acceleration would overshoot their velocity target, apply less thrust to hit it exactly.
        const heading = shipSprite.rotation;
        const forwardX = Math.sin(heading);
        const forwardY = -Math.cos(heading);

        // Longitudinal distance gap along heading to fine-tune station keeping
        const distFwd = dx * forwardX + dy * forwardY;
        const targetRelFwdSpeed = Math.min(20, Math.max(-20, distFwd * 1.0));
        const currentRelFwdSpeed = relVx * forwardX + relVy * forwardY;
        const dvForwardNeeded = targetRelFwdSpeed - currentRelFwdSpeed;

        if (dvForwardNeeded > 0.05) {
          const step = Math.min(dvMax, dvForwardNeeded);
          const clamped = checkSpeed(shipData.vx + step * forwardX, shipData.vy + step * forwardY, shipData.maxSpeed);
          shipData.vx = clamped.vx;
          shipData.vy = clamped.vy;
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = true;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        } else if (dvForwardNeeded < -0.05 && shipData.engine.reversible) {
          const step = Math.min(dvMax, -dvForwardNeeded);
          const clamped = checkSpeed(shipData.vx - step * forwardX, shipData.vy - step * forwardY, shipData.maxSpeed);
          shipData.vx = clamped.vx;
          shipData.vy = clamped.vy;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = true;
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
        } else {
          if (shipData.engineLitSprite) shipData.engineLitSprite.visible = false;
          if (shipData.engineReverseSprite) shipData.engineReverseSprite.visible = false;
        }
      }

      // Hard physical constraint: ensure ship never exceeds its engine's max speed
      const speedCheck = checkSpeed(shipData.vx, shipData.vy, shipData.maxSpeed);
      shipData.vx = speedCheck.vx;
      shipData.vy = speedCheck.vy;

      shipSprite.x -= (playerShip.data.vx - shipData.vx) * delta * (60 / 1000) || 0;
      shipSprite.y -= (playerShip.data.vy - shipData.vy) * delta * (60 / 1000) || 0;
    }

    // Derelict ship does not join in the fight but remains motionless in space
    if (derelictShip && !derelictShip.data.isDestroyed) {
      const dMaxA = derelictShip.data.maxHullHealth || derelictShip.data.maxArmor || 10;
      if (derelictShip.data.hullHealth <= dMaxA * DISABLED_ARMOR_THRESHOLD) {
        derelictShip.data.isDisabled = true;
        derelictShip.data.aiState = 'DISABLED';
      }
      derelictShip.data.vx = 0;
      derelictShip.data.vy = 0;
      derelictShip.sprite.x -= playerShip.data.vx * delta * (60 / 1000) || 0;
      derelictShip.sprite.y -= playerShip.data.vy * delta * (60 / 1000) || 0;
    }

    // Viewport / Frustum Culling:
    // Toggle ship.sprite.visible so PixiJS skips container transforms and draw calls
    // for all offscreen ships. All simulation, physics, AI, weapons, collisions,
    // and radar blips continue operating at 100% fidelity.
    const CULL_MARGIN = 80;
    for (let i = 0; i < ships.length; i++) {
      const s = ships[i];
      if (!s || !s.sprite || !s.data || s.data.isDestroyed) continue;
      const sx = s.sprite.x;
      const sy = s.sprite.y;
      s.sprite.visible = (
        sx >= -CULL_MARGIN &&
        sx <= GAME_WIDTH + CULL_MARGIN &&
        sy >= -CULL_MARGIN &&
        sy <= GAME_HEIGHT + CULL_MARGIN
      );
    }

    if (derelictShip && derelictShip.sprite && derelictShip.data && !derelictShip.data.isDestroyed) {
      const dx = derelictShip.sprite.x;
      const dy = derelictShip.sprite.y;
      derelictShip.sprite.visible = (
        dx >= -CULL_MARGIN &&
        dx <= GAME_WIDTH + CULL_MARGIN &&
        dy >= -CULL_MARGIN &&
        dy <= GAME_HEIGHT + CULL_MARGIN
      );
    }

    for (var i = 0; i < stars.length; i++) {
      let star = stars[i];
      star.x -= playerShip.data.vx * delta * (60 / 1000) * star.distanceMod || 0;
      star.y -= playerShip.data.vy * delta * (60 / 1000) * star.distanceMod || 0;

      if (star.x + OFFSCREEN < 0) {
        star.x += GAME_WIDTH + randomInt(OFFSCREEN, 2 * OFFSCREEN);
      }
      if (star.x - OFFSCREEN > GAME_WIDTH) {
        star.x -= GAME_WIDTH - randomInt(-1 * OFFSCREEN, -2 * OFFSCREEN);
      }
      if (star.y + OFFSCREEN < 0) {
        star.y += GAME_HEIGHT + randomInt(OFFSCREEN, 2 * OFFSCREEN);
      }
      if (star.y - OFFSCREEN > GAME_HEIGHT) {
        star.y -= GAME_HEIGHT - randomInt(-1 * OFFSCREEN, -2 * OFFSCREEN);
      }
    }

    // Render tactical targeting brackets around current target in main view
    updateTargetBracket();

    // Render tactical radar screen
    drawRadar(delta);

    // Render live target view
    drawTargetView();

    // Update player ship status readout
    updatePlayerStatusUI();
  }

  app.ticker.add((ticker) => {
    const delta = typeof ticker === 'number' ? ticker : (ticker && ticker.deltaTime != null ? ticker.deltaTime : 1);
    gameLoop(delta);
  });
}

async function init() {
  app = new PIXI.Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#010d21',
  });
  const container = document.getElementById("game-container");
  if (container) {
    container.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  await Promise.all([
    PIXI.Assets.load(ASSET_PATHS),
    preloadRawImages(ASSET_PATHS),
  ]);
  setup();
}

init().catch(err => {
  console.error('Initialization error:', err);
  if (DEBUG) {
    DEBUG.textContent = 'Error initializing game: ' + err.message;
  }
});
