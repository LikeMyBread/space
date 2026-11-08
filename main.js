'use strict';

const DEBUG = document.getElementById("debug");
const fpsDisplay = document.getElementById("fps-counter");
const shipCountDisplay = document.getElementById("ship-count");
const spawnBtn = document.getElementById("spawn-btn");
const spawnTenBtn = document.getElementById("spawn-ten-btn");
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

let onTabPressed = null;

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;
const OFFSCREEN = 100;
const PIXELS_PER_METER = 1;
const TURN_RATE = 0.04; // rad/frame
const ACCEL_LIMIT = 10; // seconds
const FORMATION_DISTANCE = 100; // px

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

if (typeof window !== 'undefined') {
  window.getRadarRadiusFraction = getRadarRadiusFraction;
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
    img: "img/weapons/Blaster.png",
    size: 0,
    attachmentPoint: {x: 2, y: 10}, // down and to the right of top left corner (0-indexed)
    projectileOrigin: {x: 2, y: 2}, // relative to weapon top-left
    fireRate: 2, // shots per second (halved from 4)
    projectile: {
      img: "img/weapons/Blaster Bolt.png",
      pivot: {x: 1, y: 1},
      speed: 100, // px/s (doubled from 50 px/s)
      rotation: 0.1, // spin speed in rad/tick
      rotationSpeed: 0.1,
      lifetime: 0.75, // seconds (halved from 1.5s to preserve 75px range)
    }
  }
};

const HULLS_DATA = [
  {
    name: 'Anvil',
    mass: 20000, // kg
    pivot: {x: 15, y: 17},
    engine_mount: {x: 15, y: 24},
    img: "img/ships/Anvil.png",
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
    pivot: {x: 15, y: 17},
    engine_mount: {x: 15, y: 28},
    img: "img/ships/Avocado.png",
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
    pivot: {x: 16, y: 15},
    engine_mount: {x: 16, y: 28},
    img: "img/ships/Boat.png",
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
    pivot: {x: 15, y: 18},
    engine_mount: {x: 15, y: 25},
    img: "img/ships/Crab.png",
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
    pivot: {x: 14, y: 16},
    engine_mount: {x: 14, y: 25},
    img: "img/ships/Delta.png",
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
    pivot: {x: 15, y: 14},
    engine_mount: {x: 15, y: 24},
    img: "img/ships/Hammer.png",
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
    pivot: {x: 9, y: 12},
    engine_mount: {x: 9, y: 20},
    img: "img/ships/Protogon.png",
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
    pivot: {x: 15, y: 17},
    engine_mount: {x: 15, y: 28},
    img: "img/ships/Shadow.png",
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
    pivot: {x: 14, y: 16},
    engine_mount: {x: 14, y: 26},
    img: "img/ships/Shuttle.png",
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
    pivot: {x: 15, y: 14},
    engine_mount: {x: 15, y: 23},
    img: "img/ships/Skate.png",
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

  const orderedSlots = calculateArbitraryFormationOrdering(followerShips.length, spacing);

  for (let i = 0; i < followerShips.length; i++) {
    const ship = followerShips[i];
    const slot = orderedSlots[i];
    ship.data.formationLeader = leader;
    ship.data.formationSlot = slot;
    ship.data.formationOffset = { x: slot.x, y: slot.y };
  }
}

const stars = [];
const projectiles = [];

function checkSpeed(vx, vy, speedLimit) {
  const SPEED = Math.sqrt(vx * vx + vy * vy);
  if (SPEED > speedLimit && SPEED > 0) {
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

  // Create projectile sprite
  const sprite = new PIXI.Sprite(PIXI.Assets.get(projData.img));
  sprite.pivot.set(projData.pivot.x, projData.pivot.y);
  sprite.position.set(spawnX, spawnY);
  sprite.rotation = rotation;

  // Layering: determine whether projectile renders above or below parent ship
  const shipIndex = app.stage.getChildIndex(ship.sprite);
  if (hardpoint.onTop) {
    app.stage.addChildAt(sprite, shipIndex + 1);
  } else {
    app.stage.addChildAt(sprite, shipIndex);
  }

  const spinSpeed = projData.rotation !== undefined ? projData.rotation : (projData.rotationSpeed !== undefined ? projData.rotationSpeed : 0.1);

  projectiles.push({
    sprite,
    vx,
    vy,
    rotation: spinSpeed,
    rotationSpeed: spinSpeed,
    shipId: ship.data.id,
    originTime: performance.now(),
    lifetime: projData.lifetime,
  });
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
  for (let i = 0; i < numberOfStars; i++) {
    let star = new PIXI.Sprite(
      PIXI.Assets.get("img/stars/Star.png")
    );
    let x = randomInt(0 - OFFSCREEN, GAME_WIDTH + OFFSCREEN);
    let y = randomInt(0 - OFFSCREEN, GAME_HEIGHT + OFFSCREEN);

    star.x = x;
    star.y = y;
    star.distanceMod = Math.random() / 5 + 0.75;

    stars.push(star);
    app.stage.addChild(star);
  }

  // Player ship starts with the default Crimson Vanguard paint and default blaster
  const playerShip = buildShip(null, null, FACTION_PAINTS[0]);
  playerShip.sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  app.stage.addChild(playerShip.sprite);

  // Derelict test ship that simply floats in place and does nothing
  const derelictHull = HULLS_DATA.find((h) => h.name === 'Boat') || randomChoice(HULLS_DATA);
  const derelictEngine = ENGINES_DATA[0];
  const derelictPaint = FACTION_PAINTS[3]; // Solaris Guild (Gold)
  const derelictShip = buildShip(derelictHull, derelictEngine, derelictPaint);
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

  const ships = [];

  // Tactical targeting bracket graphics in the main view
  const targetBracketGraphics = new PIXI.Graphics();
  app.stage.addChild(targetBracketGraphics);

  function updateShipCount() {
    if (shipCountDisplay) {
      const totalNpc = ships.length + (derelictShip ? 1 : 0);
      shipCountDisplay.textContent = totalNpc.toLocaleString();
    }
  }

  function spawnNpcShips(count) {
    for (let i = 0; i < count; i++) {
      const npc = buildShip();
      npc.sprite.position.set(GAME_WIDTH * Math.random(), GAME_HEIGHT * Math.random());
      ships.push(npc);
      app.stage.addChild(npc.sprite);
    }
    // Keep targeting bracket HUD overlay on top of all ships
    app.stage.addChild(targetBracketGraphics);
    // Form the fleet: assign each ship a position in the hexagonal grid based on arbitrary ordering
    formFleet(playerShip, ships);
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
      formFleet(playerShip, ships);
      event.target.blur();
    });
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
      }
      event.target.blur();
    });
  }

  playerShip.data.vx = 0;
  playerShip.data.vy = 0;

  function getTargetableShips() {
    const list = [];
    if (derelictShip) list.push(derelictShip);
    for (let i = 0; i < ships.length; i++) {
      if (ships[i]) list.push(ships[i]);
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

  if (typeof window !== 'undefined') {
    window.getTargetableShips = getTargetableShips;
    window.getCurrentTarget = getCurrentTarget;
    window.cycleTarget = cycleTarget;
    window.drawTargetView = drawTargetView;
    window.drawRadar = drawRadar;
    window.getRadarRadiusFraction = getRadarRadiusFraction;
    window.RADAR_RINGS = RADAR_RINGS;
    window.RADAR_MAX_DIST = RADAR_MAX_DIST;
    window.gameLoop = gameLoop;
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
      if (!targetShip || !targetShip.sprite) return;

      let rx = cx;
      let ry = cy;
      const color = (targetShip.data && targetShip.data.paint) ? targetShip.data.paint.hex : '#ffffff';

      if (!isPlayer) {
        const dx = targetShip.sprite.x - playerShip.sprite.x;
        const dy = targetShip.sprite.y - playerShip.sprite.y;
        const dist = Math.hypot(dx, dy);

        let r;
        if (dist >= RADAR_MAX_DIST) {
          // Contacts at 4000m+ are clamped to the outermost ring via separate check
          r = maxR;
        } else if (dist <= 0) {
          r = 0;
        } else {
          // Continuous exponential/logarithmic range mapping for < 4000m
          r = maxR * getRadarRadiusFraction(dist);
        }

        const scaleR = dist > 0 ? (r / dist) : 0;
        rx = cx + dx * scaleR;
        ry = cy + dy * scaleR;
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

    if (!targetShip || !targetShip.data) {
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

      targetCtx.restore();
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

    // Lock status
    targetCtx.fillStyle = '#38bdf8';
    targetCtx.textAlign = 'right';
    targetCtx.fillText('TRK: LOCK', width - 12, 17);
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
      targetStateVal.textContent = targetShip.data.aiState || (targetShip.data.isDerelict ? 'DERELICT' : 'IDLE');
    }
  }

  function updateTargetBracket() {
    targetBracketGraphics.clear();
    const target = getCurrentTarget();
    if (!target || !target.sprite || target === playerShip) {
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

    // Update active projectiles
    const now = performance.now();
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      if ((now - proj.originTime) / 1000 >= proj.lifetime) {
        app.stage.removeChild(proj.sprite);
        proj.sprite.destroy();
        projectiles.splice(i, 1);
        continue;
      }

      proj.sprite.x += (proj.vx - playerShip.data.vx) * delta * (60 / 1000);
      proj.sprite.y += (proj.vy - playerShip.data.vy) * delta * (60 / 1000);
      proj.sprite.rotation += (proj.rotation || proj.rotationSpeed || 0) * delta;
    }

    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const shipSprite = ship.sprite;
      const shipData = ship.data;

      // Formation offset relative to the formation leader based on the hexagonal grid
      const offset = shipData.formationOffset || { x: 0, y: FORMATION_DISTANCE };
      const targetX = playerShip.sprite.x + offset.x;
      const targetY = playerShip.sprite.y + offset.y;

      // Distance and vector from ship to its assigned formation position
      const dx = targetX - shipSprite.x;
      const dy = targetY - shipSprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Relative velocity: v_npc - v_player
      const relVx = shipData.vx - playerShip.data.vx;
      const relVy = shipData.vy - playerShip.data.vy;
      const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

      const dt = delta * (60 / 1000);
      const dvMax = shipData.accel * dt;
      const matchTolerance = Math.max(1.5, dvMax * 0.8);

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

      // Behavior state transitions
      if (!shipData.aiState) {
        shipData.aiState = dist > brakeThreshold ? 'APPROACH' : 'FORMATION';
      }

      if (shipData.aiState === 'APPROACH') {
        if (dist <= brakeThreshold) {
          shipData.aiState = 'BRAKE';
        }
      } else if (shipData.aiState === 'BRAKE') {
        if (relSpeed <= matchTolerance) {
          shipData.aiState = dist <= 30 ? 'FORMATION' : 'APPROACH';
        } else if (dist > brakeThreshold * 1.3 + 10) {
          shipData.aiState = 'APPROACH';
        }
      } else if (shipData.aiState === 'FORMATION') {
        // Fall out of formation if displaced from station or relative speed becomes significant
        if (dist > 30 || relSpeed > matchTolerance * 2.5) {
          shipData.aiState = 'APPROACH';
        }
      }

      // Execute current behavior
      if (shipData.aiState === 'APPROACH') {
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
            const targetSpeedInDir = (playerShip.data.vx + desiredVx) * forwardX + (playerShip.data.vy + desiredVy) * forwardY;

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
        // Matched velocity: turn to face the same direction as the player to follow their lead
        const targetAngle = playerShip.sprite.rotation;
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

    // Derelict ship simply floats in place: its position relative to camera tracks player motion
    if (derelictShip) {
      derelictShip.sprite.x -= playerShip.data.vx * delta * (60 / 1000) || 0;
      derelictShip.sprite.y -= playerShip.data.vy * delta * (60 / 1000) || 0;
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
