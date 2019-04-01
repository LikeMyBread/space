const gameKeys = ['w', 'a', 'd', 'up', 'left', 'right'];
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

function isTurningLeft() {
  return keyState[37] || keyState[65];
}

function isTurningRight() {
  return keyState[39] || keyState[68];
}

var app = new PIXI.Application(GAME_WIDTH, GAME_HEIGHT, {backgroundColor : '#010d21'});
document.body.appendChild(app.view);

const SHIP_DATA = {
  protogon : {
    name: 'Protogon',
    pivot: {x: 10, y: 12},
    size: {x: 21, y: 26},
    engine_mount: {x: 10, y: 20},
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

var container = new PIXI.Container();
app.stage.addChild(container);

const protoData = SHIP_DATA['protogon'];
const thrusterData = ENGINE_DATA['thruster'];

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
  .add("img/engines/TurboThruster.png")
  .add("img/stars/Star.png")
  .load(setup);

const ship = new PIXI.Container();
const starField = new PIXI.particles.ParticleContainer();

const stars = [];

function setup() {
  const data = SHIP_DATA.protogon;

  let body = new PIXI.Sprite(
    PIXI.loader.resources["img/ships/Protogon.png"].texture
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

  const numberOfStars = 20;
  for (let i = 0; i < numberOfStars; i++) {
    let star = new PIXI.Sprite(
      PIXI.loader.resources["img/stars/Star.png"].texture
    );
    let x = randomInt(0 - OFFSCREEN, GAME_WIDTH + OFFSCREEN);
    let y = randomInt(0 - OFFSCREEN, GAME_HEIGHT + OFFSCREEN);

    star.x = x;
    star.y = y;

    stars.push(star);
    starField.addChild(star);
  }

  ship.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);

  app.stage.addChild(starField);
  app.stage.addChild(ship);

  app.ticker.add(delta => gameLoop(delta));
}

const TURN_RATE = 0.08;
const ACCEL = 0.02;
let vx = 0;
let vy = 0;
function gameLoop(delta){
  if (isTurningLeft()) {
    ship.rotation -= TURN_RATE;
  }

  if (isTurningRight()) {
    ship.rotation += TURN_RATE;
  }

  if (isThrusting()) {
    ship.children[2].visible = true;
    vx += ACCEL * Math.sin(ship.rotation);
    vy -= ACCEL * Math.cos(ship.rotation);
  } else if (ship.children[2].visible) {
    ship.children[2].visible = false;
  }

  starField.x -= vx || 0;
  starField.y -= vy || 0;

  for (var i = 0; i < stars.length; i++) {
    if (starField.x + stars[i].x + OFFSCREEN < 0) {
      stars[i].x += GAME_WIDTH + randomInt(OFFSCREEN, 2 * OFFSCREEN);
    }
    if (starField.x + stars[i].x - OFFSCREEN > GAME_WIDTH) {
      stars[i].x -= GAME_WIDTH - randomInt(-1 * OFFSCREEN, -2 * OFFSCREEN);
    }
    if (starField.y + stars[i].y + OFFSCREEN < 0) {
      stars[i].y += GAME_HEIGHT + randomInt(OFFSCREEN, 2 * OFFSCREEN);
    }
    if (starField.y + stars[i].y - OFFSCREEN > GAME_HEIGHT) {
      stars[i].y -= GAME_HEIGHT - randomInt(-1 * OFFSCREEN, -2 * OFFSCREEN);
    }
  }
}
