'use strict';

const DEBUG = document.getElementById("debug");

const gameKeys = ['w', 'a', 's', 'd', 'up', 'left', 'down', 'right'];
const keyState = {};

const GAME_WIDTH = 800;
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
    thrust: 500, // kN
    mass: 3500, // kg
    reversible: true,
    img: "img/engines/Thruster.png",
    imgLit: "img/engines/Thruster_lit.png",
    imgReverse: "img/engines/Thruster_reverse.png",
  },
  {
    name: 'turbo_thruster',
    pivot: {x: 1, y: 2},
    thrust: 1000, // kN
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
  const hull = randomChoice(HULLS_DATA);
  const engineData = randomChoice(ENGINES_DATA);

  let body = new PIXI.Sprite(
    PIXI.loader.resources[hull.img].texture
  );
  newShip.addChild(body);
  newShip.pivot.set(hull.pivot.x, hull.pivot.y);

  let engine = new PIXI.Sprite(
    PIXI.loader.resources[engineData.img].texture
  );
  engine.pivot.set(engineData.pivot.x, engineData.pivot.y);
  engine.position.set(hull.engine_mount.x, hull.engine_mount.y);
  newShip.addChild(engine);

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


  const newData = {
    hull,
    engine: engineData,
  }

  return { sprite: newShip, data: newData };
}

const stars = [];


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
    star.distanceMod = Math.random() / 10 + 0.5;

    stars.push(star);
    app.stage.addChild(star);
  }

  const ship = buildShip();
  ship.sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  app.stage.addChild(ship.sprite);
  const TURN_RATE = 0.04;
  const ACCEL = (ship.data.engine.thrust * 1000) / (ship.data.hull.mass + ship.data.engine.mass); // m/s/s
  const SPEED_LIMIT = ACCEL * 10; // m/s
  let vx = 0;
  let vy = 0;

  function checkSpeed(vx, vy) {
    const SPEED = Math.sqrt(vx * vx + vy * vy);
    if (SPEED > SPEED_LIMIT) {
      const theta = Math.atan2(vy, vx);
      vy = SPEED_LIMIT * Math.sin(theta);
      vx = SPEED_LIMIT * Math.cos(theta);
    }
    return { vx: vx, vy: vy };
  }


  function gameLoop(delta){

    if (isTurningLeft()) {
      ship.sprite.rotation -= TURN_RATE;
    }

    if (isTurningRight()) {
      ship.sprite.rotation += TURN_RATE;
    }


    if (isThrusting()) {
      const dvx = ACCEL * delta * (60 / 1000) * Math.sin(ship.sprite.rotation);
      const dvy = ACCEL * delta * (60 / 1000) * Math.cos(ship.sprite.rotation);
      vx += dvx;
      vy -= dvy;

      const newSpeed = checkSpeed(vx, vy);
      vx = newSpeed.vx;
      vy = newSpeed.vy;

      ship.sprite.children[2].visible = true;
    } else if (ship.sprite.children[2].visible) {
      ship.sprite.children[2].visible = false;
    }

    if (isReversing() && ship.data.engine.reversible) {
      const dvx = ACCEL * delta * (60 / 1000) * Math.sin(ship.sprite.rotation);
      const dvy = ACCEL * delta * (60 / 1000) * Math.cos(ship.sprite.rotation);
      vx -= dvx;
      vy += dvy;

      const newSpeed = checkSpeed(vx, vy);
      vx = newSpeed.vx;
      vy = newSpeed.vy;

      ship.sprite.children[3].visible = true;
    } else if (ship.data.engine.reversible && ship.sprite.children[3].visible) {
      ship.sprite.children[3].visible = false;
    }

    for (var i = 0; i < stars.length; i++) {
      let star = stars[i];
      star.x -= vx * delta * (60 / 1000) * star.distanceMod || 0;
      star.y -= vy * delta * (60 / 1000) * star.distanceMod || 0;

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
