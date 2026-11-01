'use strict';

const DEBUG = document.getElementById("debug");
const fpsDisplay = document.getElementById("fps-counter");
const shipCountDisplay = document.getElementById("ship-count");
const spawnBtn = document.getElementById("spawn-btn");

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

const HULLS_DATA = [
  {
    name: 'Anvil',
    mass: 20000, // kg
    pivot: {x: 15, y: 17},
    engine_mount: {x: 15, y: 24},
    img: "img/ships/Anvil.png",
  },
  {
    name: 'Avocado',
    mass: 20000, // kg
    pivot: {x: 15, y: 17},
    engine_mount: {x: 15, y: 28},
    img: "img/ships/Avocado.png",
  },
  {
    name: 'Boat',
    mass: 20000, // kg
    pivot: {x: 16, y: 15},
    engine_mount: {x: 16, y: 28},
    img: "img/ships/Boat.png",
  },
  {
    name: 'Crab',
    mass: 20000, // kg
    pivot: {x: 15, y: 18},
    engine_mount: {x: 15, y: 25},
    img: "img/ships/Crab.png",
  },
  {
    name: 'Delta',
    mass: 20000, // kg
    pivot: {x: 14, y: 16},
    engine_mount: {x: 14, y: 25},
    img: "img/ships/Delta.png",
  },
  {
    name: 'Hammer',
    mass: 20000, // kg
    pivot: {x: 15, y: 14},
    engine_mount: {x: 15, y: 24},
    img: "img/ships/Hammer.png",
  },
  {
    name: 'Protogon',
    mass: 20000, // kg
    pivot: {x: 9, y: 12},
    engine_mount: {x: 9, y: 20},
    img: "img/ships/Protogon.png",
  },
  {
    name: 'Shadow',
    mass: 20000, // kg
    pivot: {x: 15, y: 17},
    engine_mount: {x: 15, y: 28},
    img: "img/ships/Shadow.png",
  },
  {
    name: 'Shuttle',
    mass: 20000, // kg
    pivot: {x: 14, y: 16},
    engine_mount: {x: 14, y: 26},
    img: "img/ships/Shuttle.png",
  },
  {
    name: 'Skate',
    mass: 20000, // kg
    pivot: {x: 15, y: 14},
    engine_mount: {x: 15, y: 23},
    img: "img/ships/Skate.png",
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

// In-memory cache for baked static ship textures: (hull + engine + paintColor)
const bakedTextureCache = new Map();

function getBakedShipTexture(hull, engineData, paintColor) {
  const cacheKey = `${hull.name}_${engineData.name}_${paintColor.name}`;
  if (bakedTextureCache.has(cacheKey)) {
    return bakedTextureCache.get(cacheKey);
  }

  const hullImg = rawImages[hull.img];
  const engineImg = rawImages[engineData.img];

  const ex = hull.engine_mount.x - engineData.pivot.x;
  const ey = hull.engine_mount.y - engineData.pivot.y;

  const canvasWidth = Math.max(hullImg.width, ex + engineImg.width);
  const canvasHeight = Math.max(hullImg.height, ey + engineImg.height);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Draw hull image at (0, 0)
  ctx.drawImage(hullImg, 0, 0);

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

  // Draw static engine on top at mount position
  ctx.drawImage(engineImg, ex, ey);

  const texture = PIXI.Texture.from(canvas);
  bakedTextureCache.set(cacheKey, texture);
  return texture;
}

function buildShip(hullChoice, engineChoice, paintChoice) {
  const newShip = new PIXI.Container();
  const hull = hullChoice || randomChoice(HULLS_DATA);
  const engineData = engineChoice || randomChoice(ENGINES_DATA);
  const paintColor = paintChoice || randomChoice(FACTION_PAINTS);

  // Bake static components (body + engine with custom paint color) into a single image texture
  const bakedTexture = getBakedShipTexture(hull, engineData, paintColor);
  const staticSprite = new PIXI.Sprite(bakedTexture);
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
    vx: 0,
    vy: 0,
    accel,
    hull,
    engine: engineData,
    paint: paintColor,
    staticSprite,
    engineLitSprite: engineLit,
    engineReverseSprite: engineReverse,
  };

  return { sprite: newShip, data: newData };
}

const stars = [];

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

  // Initial NPC ship with a random faction paint job
  spawnNpcShips(1);

  if (spawnBtn) {
    spawnBtn.addEventListener('click', (event) => {
      spawnNpcShips(1000);
      event.target.blur();
    });
  }

  // Player ship starts with the default Crimson Vanguard paint
  const playerShip = buildShip(null, null, FACTION_PAINTS[0]);
  playerShip.sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  app.stage.addChild(playerShip.sprite);

  function setPlayerPaint(paint) {
    playerShip.data.paint = paint;
    const newTexture = getBakedShipTexture(playerShip.data.hull, playerShip.data.engine, paint);
    playerShip.data.staticSprite.texture = newTexture;
  }

  const paintSelect = document.getElementById('paint-select');
  if (paintSelect) {
    paintSelect.addEventListener('change', (event) => {
      const selectedName = event.target.value;
      const paint = FACTION_PAINTS.find((p) => p.name === selectedName);
      if (paint) {
        setPlayerPaint(paint);
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
  document.body.appendChild(app.canvas);

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
