const gameKeys = ['w', 'a', 's', 'd', 'up', 'left', 'down', 'right', 'q', 'e'];
const keyState = {};

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const OFFSCREEN = 100;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

function isStrafingLeft() {
  return keyState[81];
}

function isTurningRight() {
  return keyState[39] || keyState[68];
}

function isStrafingRight() {
  return keyState[69];
}

var app = new PIXI.Application(GAME_WIDTH, GAME_HEIGHT, {backgroundColor : '#010d21'});
document.body.appendChild(app.view);

const SHIP_DATA = {
  protogon : {
    name: 'Protogon',
    pivot: {x: 10, y: 12},
    size: {x: 21, y: 26},
    engine_mount: {x: 10, y: 20},
    thruster_pivot: {x: 10, y: 20},
  }
}

const ENGINE_DATA = {
  thruster : {
    name: 'thruster',
    pivot: {x: 3, y: 1},
  }
}

const SHIP = {
  hull: SHIP_DATA.protogon,
  engine: ENGINE_DATA.thruster,
}

const protoData = SHIP_DATA['protogon'];
const thrusterData = ENGINE_DATA['thruster'];

PIXI.loader
  .add("img/ships/Anvil.png")
  .add("img/ships/Avocado.png")
  .add("img/ships/Boat.png")
  .add("img/ships/Crab.png")
  .add("img/ships/Delta.png")
  .add("img/ships/Hammer.png")
  .add("img/ships/Protogon/body.png")
  .add("img/ships/Protogon/thrusters/front.png")
  .add("img/ships/Protogon/thrusters/back_left.png")
  .add("img/ships/Protogon/thrusters/back_right.png")
  .add("img/ships/Protogon/thrusters/front_left.png")
  .add("img/ships/Protogon/thrusters/front_right.png")
  .add("img/ships/Shadow.png")
  .add("img/ships/Shuttle.png")
  .add("img/ships/Skate.png")
  .add("img/engines/Thruster.png")
  .add("img/engines/Thruster_lit.png")
  .add("img/engines/TurboThruster.png")
  .add("img/stars/Star.png")
  .load(setup);

const ship = new PIXI.Container();

const stars = [];

function setup() {
  const data = SHIP_DATA.protogon;

  let body = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon/body.png"].texture
  );
  ship.addChild(body);
  ship.pivot.set(data.pivot.x, data.pivot.y);

  let engine = new PIXI.Sprite(
    PIXI.loader.resources["img/engines/Thruster.png"].texture
  );
  engine.pivot.set(thrusterData.pivot.x, thrusterData.pivot.y);
  engine.position.set(protoData.engine_mount.x, protoData.engine_mount.y);
  ship.addChild(engine);

  let engineLit = new PIXI.Sprite(
    PIXI.loader.resources["img/engines/Thruster_lit.png"].texture
  );
  engineLit.pivot.set(thrusterData.pivot.x, thrusterData.pivot.y);
  engineLit.position.set(protoData.engine_mount.x, protoData.engine_mount.y);
  ship.addChild(engineLit);
  engineLit.visible = false;

  let frontThruster = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon/thrusters/front.png"].texture
  );
  frontThruster.pivot.set(protoData.pivot.x, protoData.pivot.y);
  frontThruster.position.set(5, 9);
  ship.addChild(frontThruster);
  frontThruster.visible = false;

  let backLeftThruster = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon/thrusters/back_left.png"].texture
  );
  backLeftThruster.pivot.set(protoData.pivot.x, protoData.pivot.y);
  backLeftThruster.position.set(5, 9);
  ship.addChild(backLeftThruster);
  backLeftThruster.visible = false;

  let backRightThruster = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon/thrusters/back_right.png"].texture
  );
  backRightThruster.pivot.set(protoData.pivot.x, protoData.pivot.y);
  backRightThruster.position.set(5, 9);
  ship.addChild(backRightThruster);
  backRightThruster.visible = false;

  let frontLeftThruster = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon/thrusters/front_left.png"].texture
  );
  frontLeftThruster.pivot.set(protoData.pivot.x, protoData.pivot.y);
  frontLeftThruster.position.set(5, 9);
  ship.addChild(frontLeftThruster);
  frontLeftThruster.visible = false;

  let frontRightThruster = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon/thrusters/front_right.png"].texture
  );
  frontRightThruster.pivot.set(protoData.pivot.x, protoData.pivot.y);
  frontRightThruster.position.set(5, 9);
  ship.addChild(frontRightThruster);
  frontRightThruster.visible = false;

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

  ship.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);

  app.stage.addChild(ship);

  app.ticker.add(delta => gameLoop(delta));
}

const TURN_RATE = 0.08;
const ACCEL = 0.02;
let vx = 0;
let vy = 0;
function gameLoop(delta){
  ship.children[4].visible = false;
  ship.children[5].visible = false;
  ship.children[6].visible = false;
  ship.children[7].visible = false;

  if (isTurningLeft()) {
    ship.rotation -= TURN_RATE;
    ship.children[4].visible = true;
    ship.children[7].visible = true;
  }

  if (isStrafingLeft()) {
    vx -= ACCEL * Math.cos(ship.rotation);
    vy -= ACCEL * Math.sin(ship.rotation);
    ship.children[5].visible = true;
    ship.children[7].visible = true;
  }

  if (isTurningRight()) {
    ship.rotation += TURN_RATE;
    ship.children[5].visible = true;
    ship.children[6].visible = true;
  }

  if (isStrafingRight()) {
    vx += ACCEL * Math.cos(ship.rotation);
    vy += ACCEL * Math.sin(ship.rotation);
    ship.children[4].visible = true;
    ship.children[6].visible = true;
  }

  if (isThrusting()) {
    ship.children[2].visible = true;
    vx += ACCEL * Math.sin(ship.rotation);
    vy -= ACCEL * Math.cos(ship.rotation);
  } else if (ship.children[2].visible) {
    ship.children[2].visible = false;
  }

  if (isReversing()) {
    ship.children[3].visible = true;
    vx -= ACCEL * Math.sin(ship.rotation);
    vy += ACCEL * Math.cos(ship.rotation);
  } else if (ship.children[3].visible) {
    ship.children[3].visible = false;
  }

  for (var i = 0; i < stars.length; i++) {
    let star = stars[i];
    star.x -= vx * star.distanceMod || 0;
    star.y -= vy * star.distanceMod || 0;

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
