'use strict';

const DEBUG = document.getElementById("debug");

const gameKeys = ['w', 'a', 's', 'd', 'up', 'left', 'down', 'right'];
const keyState = {};

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

function handleKeydown(event) {
  if (!event) return;
  const tag = event.target.tagName.toLowerCase();
  //  Make sure keys can still be inputted if a form is focused.
  if (tag === 'input' || tag === 'textarea') return;
  keyState[event.keyCode || event.which] = true;
  event.preventDefault();
}

function handleKeyup(event) {
  if (!event) return;
  const tag = event.target.tagName.toLowerCase();
  //  Make sure keys can still be inputted if a form is focused.
  if (tag === 'input' || tag === 'textarea') return;
  keyState[event.keyCode || event.which] = false;
  event.preventDefault();
}

Mousetrap.bind(gameKeys, event => handleKeydown(event), 'keydown');
Mousetrap.bind(gameKeys, event => handleKeyup(event), 'keyup');

function isThrusting() {
  return keyState[38] || keyState[87];
}

function isReversing() {
  return keyState[40] || keyState[83];
}

function isTurningLeft() {
  return (keyState[37] || keyState[65]) && !keyState[16];
}

function isTurningRight() {
  return keyState[39] || keyState[68];
}

var app = new PIXI.Application(GAME_WIDTH, GAME_HEIGHT, {backgroundColor : '#010d21'});
document.body.appendChild(app.view);

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
]

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

PIXI.loader
  .add("img/ships/Anvil.png")
  .add("img/ships/Avocado.png")
  .add("img/ships/Boat.png")
  .add("img/ships/Crab.png")
  .add("img/ships/Delta.png")
  .add("img/ships/Hammer.png")
  .add("img/ships/Protogon.png")
  .add("img/ships/Shadow.png")
  .add("img/ships/Shuttle.png")
  .add("img/ships/Skate.png")
  .add("img/engines/Thruster.png")
  .add("img/engines/Thruster_lit.png")
  .add("img/engines/Thruster_reverse.png")
  .add("img/engines/TurboThruster.png")
  .add("img/engines/TurboThruster_lit.png")
  .add("img/stars/Star.png")
  .load(setup);


function buildShip() {
  const newShip = new PIXI.Container();
  const staticParts = new PIXI.Container();
  staticParts.cacheAsBitmap = true;
  const hull = randomChoice(HULLS_DATA);
  const engineData = randomChoice(ENGINES_DATA);

  let body = new PIXI.Sprite(
    PIXI.loader.resources[hull.img].texture
  );
  staticParts.addChild(body);
  newShip.addChild(staticParts);
  newShip.pivot.set(hull.pivot.x, hull.pivot.y);

  let engine = new PIXI.Sprite(
    PIXI.loader.resources[engineData.img].texture
  );
  engine.pivot.set(engineData.pivot.x, engineData.pivot.y);
  engine.position.set(hull.engine_mount.x, hull.engine_mount.y);
  staticParts.addChild(engine);

  let engineLit = new PIXI.Sprite(
    PIXI.loader.resources[engineData.imgLit].texture
  );
  engineLit.pivot.set(engineData.pivot.x, engineData.pivot.y);
  engineLit.position.set(hull.engine_mount.x, hull.engine_mount.y);
  newShip.addChild(engineLit);
  engineLit.visible = false;

  if (engineData.reversible) {
    let engineReverse = new PIXI.Sprite(
      PIXI.loader.resources[engineData.imgReverse].texture
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
  }

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


function setup() {
  const numberOfStars = 20;
  for (let i = 0; i < numberOfStars; i++) {
    let star = new PIXI.Sprite(
      PIXI.loader.resources["img/stars/Star.png"].texture
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
  const ACCEL = (playerShip.data.engine.thrust * 1000) / (playerShip.data.hull.mass + playerShip.data.engine.mass); // m/s/s
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

      playerShip.sprite.children[1].visible = true;
    } else if (playerShip.sprite.children[1].visible) {
      playerShip.sprite.children[1].visible = false;
    }

    if (isReversing() && playerShip.data.engine.reversible) {
      const dvx = ACCEL * delta * (60 / 1000) * Math.sin(playerShip.sprite.rotation);
      const dvy = ACCEL * delta * (60 / 1000) * Math.cos(playerShip.sprite.rotation);
      playerShip.data.vx -= dvx;
      playerShip.data.vy += dvy;

      const newSpeed = checkSpeed(playerShip.data.vx, playerShip.data.vy, ACCEL_LIMIT);
      playerShip.data.vx = newSpeed.vx;
      playerShip.data.vy = newSpeed.vy;

      playerShip.sprite.children[2].visible = true;
    } else if (playerShip.data.engine.reversible && playerShip.sprite.children[2].visible) {
      playerShip.sprite.children[2].visible = false;
    }

    for (var i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const shipSprite = ship.sprite;
      const shipData = ship.data;

      const newSpeed = applyThrust(ship, delta, ACCEL_LIMIT);
      if (newSpeed.vx != shipData.vx || newSpeed.vy != shipData.vy) {
        shipData.vx = newSpeed.vx;
        shipData.vy = newSpeed.vy;
        shipSprite.children[1].visible = true;
      } else {
        shipSprite.children[1].visible = false;
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

  app.ticker.add(delta => gameLoop(delta));
}
