'use strict';

const DEBUG = document.getElementById("debug");

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
  // Make sure keys can still be inputted if a form is focused.
  if (tag === 'input' || tag === 'textarea' || event.target.isContentEditable) return;

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
  if (tag === 'input' || tag === 'textarea' || event.target.isContentEditable) return;

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

function buildShip() {
  const newShip = new PIXI.Container();
  const staticParts = new PIXI.Container();
  if (typeof staticParts.cacheAsTexture === 'function') {
    staticParts.cacheAsTexture(true);
  } else {
    staticParts.cacheAsBitmap = true;
  }
  const hull = randomChoice(HULLS_DATA);
  const engineData = randomChoice(ENGINES_DATA);

  let body = new PIXI.Sprite(
    PIXI.Assets.get(hull.img)
  );
  staticParts.addChild(body);
  newShip.addChild(staticParts);
  newShip.pivot.set(hull.pivot.x, hull.pivot.y);

  let engine = new PIXI.Sprite(
    PIXI.Assets.get(engineData.img)
  );
  engine.pivot.set(engineData.pivot.x, engineData.pivot.y);
  engine.position.set(hull.engine_mount.x, hull.engine_mount.y);
  staticParts.addChild(engine);

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
  ships.push(buildShip());
  for (let i = 0; i < ships.length; i++) {
    ships[i].sprite.position.set(GAME_WIDTH * Math.random(), GAME_HEIGHT * Math.random());
    app.stage.addChild(ships[i].sprite);
  }

  const playerShip = buildShip();
  playerShip.sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  app.stage.addChild(playerShip.sprite);

  const TURN_RATE = 0.04;
  const ACCEL_LIMIT = 10; // s
  playerShip.data.vx = 0;
  playerShip.data.vy = 0;

  function gameLoop(delta){
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

  await PIXI.Assets.load(ASSET_PATHS);
  setup();
}

init().catch(err => {
  console.error('Initialization error:', err);
  if (DEBUG) {
    DEBUG.textContent = 'Error initializing game: ' + err.message;
  }
});
