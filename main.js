'use strict';

const DEBUG = document.getElementById("debug");
const fpsDisplay = document.getElementById("fps-counter");
const shipCountDisplay = document.getElementById("ship-count");
const spawnBtn = document.getElementById("spawn-btn");
const bodySelect = document.getElementById("body-select");
const engineSelect = document.getElementById("engine-select");
const paintSelect = document.getElementById("paint-select");

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;
const OFFSCREEN = 100;
const PIXELS_PER_METER = 1;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(choices) {
  return choices[randomInt(0, choices.length - 1)];
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
    attachmentPoint: {x: 2, y: 19}, // down and to the right of top left corner (0-indexed)
    projectileOrigin: {x: 2, y: 2}, // relative to weapon top-left
    fireRate: 4, // shots per second
    projectile: {
      img: "img/weapons/Blaster Bolt.png",
      pivot: {x: 1, y: 1},
      speed: 600, // px/s
      lifetime: 1.5, // seconds
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
        onTop: false,
        location: {x: 15, y: 17},
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
        onTop: false,
        location: {x: 16, y: 15},
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
        location: {x: 15, y: 18},
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
        location: {x: 15, y: 17},
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
        location: {x: 14, y: 16},
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
  const result = { texture, offsetX, offsetY };
  bakedTextureCache.set(cacheKey, result);
  return result;
}

let nextShipId = 1;

function buildShip(hullChoice, engineChoice, paintChoice, weaponsChoice) {
  const newShip = new PIXI.Container();
  const hull = hullChoice || randomChoice(HULLS_DATA);
  const engineData = engineChoice || randomChoice(ENGINES_DATA);
  const paintColor = paintChoice || randomChoice(FACTION_PAINTS);

  // Default weapon setup: Light Blaster attached to default hardpoint
  const weapons = weaponsChoice || [
    {
      weapon: WEAPONS_DATA.light_blaster,
      hardpoint: hull.hardpoints[0],
      lastFired: 0,
    }
  ];

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

  const newData = {
    id: nextShipId++,
    vx: 0,
    vy: 0,
    accel,
    hull,
    engine: engineData,
    paint: paintColor,
    weapons,
    staticSprite,
    engineLitSprite: engineLit,
    engineReverseSprite: engineReverse,
  };

  return { sprite: newShip, data: newData };
}

const stars = [];
const projectiles = [];

function checkSpeed(vx, vy, speedLimit) {
  const SPEED = Math.sqrt(vx * vx + vy * vy);
  if (SPEED > speedLimit) {
    const theta = Math.atan2(vy, vx);
    vy = speedLimit * Math.sin(theta);
    vx = speedLimit * Math.cos(theta);
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

  projectiles.push({
    sprite,
    vx,
    vy,
    shipId: ship.data.id,
    originTime: performance.now(),
    lifetime: projData.lifetime,
  });
}

function fireShipWeapons(ship) {
  const now = performance.now();
  if (!ship.data.weapons) return;

  for (const weaponSlot of ship.data.weapons) {
    const cooldownMs = 1000 / weaponSlot.weapon.fireRate;
    if (now - weaponSlot.lastFired >= cooldownMs) {
      weaponSlot.lastFired = now;
      spawnProjectile(ship, weaponSlot);
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

  const ships = [];

  function updateShipCount() {
    if (shipCountDisplay) {
      shipCountDisplay.textContent = ships.length.toLocaleString();
    }
  }

  function spawnNpcShips(count) {
    for (let i = 0; i < count; i++) {
      const npc = buildShip();
      npc.sprite.position.set(GAME_WIDTH * Math.random(), GAME_HEIGHT * Math.random());
      ships.push(npc);
      app.stage.addChild(npc.sprite);
    }
    updateShipCount();
  }

  // Initial NPC ship with a random faction paint job and default blaster
  spawnNpcShips(1);

  if (spawnBtn) {
    spawnBtn.addEventListener('click', (event) => {
      spawnNpcShips(1000);
      event.target.blur();
    });
  }

  // Player ship starts with the default Crimson Vanguard paint and default blaster
  const playerShip = buildShip(null, null, FACTION_PAINTS[0]);
  playerShip.sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  app.stage.addChild(playerShip.sprite);

  function updatePlayerShipConfig({ hull, engine, paint }) {
    if (hull) {
      playerShip.data.hull = hull;
      // Re-assign default weapon to the new hull's default hardpoint
      if (playerShip.data.weapons && playerShip.data.weapons.length > 0) {
        playerShip.data.weapons[0].hardpoint = hull.hardpoints[0];
      }
    }
    if (engine) playerShip.data.engine = engine;
    if (paint) playerShip.data.paint = paint;

    const currentHull = playerShip.data.hull;
    const currentEngine = playerShip.data.engine;
    const currentPaint = playerShip.data.paint;

    // Recalculate acceleration
    playerShip.data.accel = (currentEngine.thrust * 1000) / (currentHull.mass + currentEngine.mass);

    // Update ship container pivot for new hull center
    playerShip.sprite.pivot.set(currentHull.pivot.x, currentHull.pivot.y);

    // Update baked static components (body + engine + paint + weapons)
    const baked = getBakedShipTexture(currentHull, currentEngine, currentPaint, playerShip.data.weapons);
    playerShip.data.staticSprite.texture = baked.texture;
    playerShip.data.staticSprite.position.set(-baked.offsetX, -baked.offsetY);

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

  const TURN_RATE = 0.04;
  const ACCEL_LIMIT = 10; // s
  playerShip.data.vx = 0;
  playerShip.data.vy = 0;

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
    }

    for (var i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const shipSprite = ship.sprite;
      const shipData = ship.data;

      const newSpeed = applyThrust(ship, delta, ACCEL_LIMIT);
      if (newSpeed.vx != shipData.vx || newSpeed.vy != shipData.vy) {
        shipData.vx = newSpeed.vx;
        shipData.vy = newSpeed.vy;
        if (shipData.engineLitSprite) {
          shipData.engineLitSprite.visible = true;
        }
      } else {
        if (shipData.engineLitSprite) {
          shipData.engineLitSprite.visible = false;
        }
      }

      const angleToPlayer = Math.PI / 2 + Math.atan2(playerShip.sprite.y - shipSprite.y, playerShip.sprite.x - shipSprite.x);
      let targetTurn = angleToPlayer - shipSprite.rotation;
      while (targetTurn > Math.PI) {
        targetTurn -= 2 * Math.PI;
      }
      while (targetTurn < -1 * Math.PI) {
        targetTurn += 2 * Math.PI;
      }
      shipSprite.rotation += Math.max(Math.min(targetTurn, TURN_RATE), -1 * TURN_RATE);

      shipSprite.x -= (playerShip.data.vx - shipData.vx) * delta * (60 / 1000) || 0;
      shipSprite.y -= (playerShip.data.vy - shipData.vy) * delta * (60 / 1000) || 0;
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
