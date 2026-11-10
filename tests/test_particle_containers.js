const path = require('path');
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('Loading PixiJS v8 and environment...');

const mockElement = () => ({
  style: {},
  classList: {
    _classes: new Set(),
    add(c) { this._classes.add(c); },
    remove(c) { this._classes.delete(c); },
    contains(c) { return this._classes.has(c); },
  },
  _listeners: {},
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  click() {
    if (this._listeners['click']) {
      for (const fn of this._listeners['click']) {
        fn({ target: this });
      }
    }
  },
  appendChild: () => {},
  getContext: () => ({
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    rect: () => {},
    strokeRect: () => {},
    clip: () => {},
    stroke: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    drawImage: () => {},
    setLineDash: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(400) }),
    putImageData: () => {},
  }),
  textContent: '',
  className: '',
  value: '',
  blur: () => {},
});

const domMap = new Map();
const document = {
  getElementById: (id) => {
    if (!domMap.has(id)) domMap.set(id, mockElement());
    return domMap.get(id);
  },
  createElement: (tag) => {
    const el = mockElement();
    if (tag === 'canvas') {
      el.width = 100;
      el.height = 100;
    }
    return el;
  },
  body: mockElement(),
};

const window = {
  addEventListener: () => {},
};

const sandbox = {
  console,
  Math,
  Date,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  ImageData: class {},
  Image: class {},
  HTMLCanvasElement: class {},
  HTMLVideoElement: class {},
  navigator: { userAgent: 'node' },
  performance: { now: () => 1000 },
  document,
  window,
  Map,
  Set,
  Uint8ClampedArray,
  Proxy,
  Object,
  Array,
  Function,
  RegExp,
  String,
  Number,
  Boolean,
  Error,
  Float32Array,
  Uint32Array,
  Int32Array,
  Uint16Array,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.addEventListener = () => {};

// Load real PixiJS v8
const pixiCode = fs.readFileSync(path.resolve(__dirname, '../pixi/pixi.min.js'), 'utf-8');
vm.createContext(sandbox);
vm.runInContext(pixiCode, sandbox);

assert(sandbox.PIXI, 'PIXI should be defined');
assert(sandbox.PIXI.ParticleContainer, 'PIXI.ParticleContainer should be defined');
assert(sandbox.PIXI.Particle, 'PIXI.Particle should be defined');
console.log('✓ PixiJS v8 loaded with ParticleContainer and Particle');

// Load and prepare main.js
let mainCode = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf-8');
mainCode = mainCode.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 30, height: 30 }) });');
mainCode = mainCode.replace('let app;', 'var app = globalThis.app;');
mainCode = mainCode.replace(/init\(\)\.catch[\s\S]*$/, '');

let registeredTickerFn = null;
sandbox.app = {
  stage: new sandbox.PIXI.Container(),
  ticker: {
    add: (fn) => { registeredTickerFn = fn; sandbox.registeredTickerFn = fn; },
    FPS: 60,
  }
};

// Mock PIXI.Assets.get to return a dummy texture
sandbox.PIXI.Assets = {
  get: (key) => sandbox.PIXI.Texture.WHITE,
};
sandbox.PIXI.Texture.from = () => sandbox.PIXI.Texture.WHITE;

const runScript = `
${mainCode}
globalThis.exported = {
  setup,
  stars,
  projectiles,
  spawnProjectile,
  removeProjectile,
  starContainer: () => starContainer,
  projectileContainerUnder: () => projectileContainerUnder,
  projectileContainerOver: () => projectileContainerOver,
  buildShip,
  FACTION_PAINTS,
  getTicker: () => globalThis.registeredTickerFn,
  getPlayerShip: () => globalThis.playerShip,
  getShips: () => globalThis.window.ships,
};
`;

vm.runInContext(runScript, sandbox);
const exp = sandbox.globalThis.exported;

console.log('1. Running setup()...');
exp.setup();

const starContainer = exp.starContainer();
const projContainerUnder = exp.projectileContainerUnder();
const projContainerOver = exp.projectileContainerOver();

assert(starContainer instanceof sandbox.PIXI.ParticleContainer, 'starContainer must be a PIXI.ParticleContainer');
assert(projContainerUnder instanceof sandbox.PIXI.ParticleContainer, 'projContainerUnder must be a PIXI.ParticleContainer');
assert(projContainerOver instanceof sandbox.PIXI.ParticleContainer, 'projContainerOver must be a PIXI.ParticleContainer');
assert.strictEqual(starContainer.particleChildren.length, 20, 'starContainer must contain 20 particle stars');
assert.strictEqual(exp.stars.length, 20, 'stars array must track 20 stars');
console.log('✓ starContainer and projectileContainers created with PixiJS v8 ParticleContainer');

console.log('2. Testing star parallax motion...');
const initialStarX = exp.stars[0].x;
const initialStarY = exp.stars[0].y;
const gameLoop = exp.getTicker();

// Give player velocity
const player = sandbox.window.playerShip;
player.data.vx = 50;
player.data.vy = 20;

// Run 1 frame
gameLoop(1);
assert.notStrictEqual(exp.stars[0].x, initialStarX, 'Star x should shift with player velocity');
assert.notStrictEqual(exp.stars[0].y, initialStarY, 'Star y should shift with player velocity');
console.log('✓ Star particles update position dynamically in ParticleContainer');

console.log('3. Testing projectile spawning into ParticleContainers...');
const shooter = exp.buildShip(null, null, exp.FACTION_PAINTS[0]);
shooter.sprite.position.set(300, 300);
shooter.sprite.rotation = 0;

// Test under-container spawn (hardpoint.onTop = false)
const slotUnder = {
  weapon: {
    name: 'Test Blaster',
    attachmentPoint: { x: 0, y: 0 },
    projectileOrigin: { x: 0, y: 0 },
    projectile: {
      speed: 100,
      lifetime: 2,
      damage: 2,
      rotation: 0.1,
      pivot: { x: 1, y: 1 },
      img: 'img/weapons/Blaster Bolt.png',
    }
  },
  hardpoint: {
    location: { x: 0, y: 0 },
    onTop: false,
  },
};

const slotOver = {
  weapon: {
    name: 'Test Cannon',
    attachmentPoint: { x: 0, y: 0 },
    projectileOrigin: { x: 0, y: 0 },
    projectile: {
      speed: 100,
      lifetime: 2,
      damage: 2,
      rotation: 0.1,
      pivot: { x: 1, y: 1 },
      img: 'img/weapons/Blaster Bolt.png',
    }
  },
  hardpoint: {
    location: { x: 0, y: 0 },
    onTop: true,
  },
};

const countUnderBefore = projContainerUnder.particleChildren.length;
const countOverBefore = projContainerOver.particleChildren.length;

exp.spawnProjectile(shooter, slotUnder);
assert.strictEqual(projContainerUnder.particleChildren.length, countUnderBefore + 1, 'Projectile should be added to under-container');
assert.strictEqual(projContainerOver.particleChildren.length, countOverBefore, 'Over-container should be untouched');

exp.spawnProjectile(shooter, slotOver);
assert.strictEqual(projContainerOver.particleChildren.length, countOverBefore + 1, 'Projectile should be added to over-container');

const latestProj = exp.projectiles[exp.projectiles.length - 1];
assert(latestProj.particle instanceof sandbox.PIXI.Particle, 'Projectile particle must be instance of PIXI.Particle');
assert.strictEqual(latestProj.sprite, latestProj.particle, 'proj.sprite should alias proj.particle');
console.log('✓ Projectiles spawn into correct under/over ParticleContainers according to hardpoint.onTop');

console.log('4. Testing projectile movement and rotation in ParticleContainer...');
const initialProjX = latestProj.particle.x;
const initialProjRot = latestProj.particle.rotation;

gameLoop(1);
assert.notStrictEqual(latestProj.particle.x, initialProjX, 'Projectile particle x should update');
assert.notStrictEqual(latestProj.particle.rotation, initialProjRot, 'Projectile particle rotation should update');
console.log('✓ Projectile particle position and rotation update smoothly');

console.log('5. Testing projectile collision and removal from ParticleContainer...');
player.data.vx = 0;
player.data.vy = 0;
latestProj.particle.x = player.sprite.x;
latestProj.particle.y = player.sprite.y + 10; // within 20px shield radius
player.data.shield = 10;
player.data.id = 999999;
latestProj.shipId = 888888;
latestProj.vx = 0;
latestProj.vy = 0;

const totalProjsBeforeHit = exp.projectiles.length;
const overCountBeforeHit = projContainerOver.particleChildren.length;

gameLoop(1);
assert.strictEqual(exp.projectiles.length, totalProjsBeforeHit - 1, 'Projectile should be removed on hit');
assert.strictEqual(projContainerOver.particleChildren.length, overCountBeforeHit - 1, 'Particle should be removed from ParticleContainer on hit');
assert.strictEqual(player.data.shield, 8, 'Player shield should be reduced by projectile damage (10 -> 8)');
console.log('✓ Projectile impact removes particle from ParticleContainer and damages target correctly');

console.log('6. Testing projectile lifetime expiry in ParticleContainer...');
const expProj = exp.projectiles[0];
sandbox.performance.now = () => 1000 + (expProj.lifetime + 1) * 1000;

const totalBeforeExpiry = exp.projectiles.length;
const underBeforeExpiry = projContainerUnder.particleChildren.length;

gameLoop(1);
assert.strictEqual(exp.projectiles.length, totalBeforeExpiry - 1, 'Expired projectile should be removed');
assert.strictEqual(projContainerUnder.particleChildren.length, underBeforeExpiry - 1, 'Expired particle removed from ParticleContainer');
console.log('✓ Projectile lifetime expiration cleanly removes particle from ParticleContainer');

console.log('7. Testing Viewport / Frustum Culling for offscreen ships & shields...');
const testNpc = exp.buildShip(null, null, exp.FACTION_PAINTS[1]);
testNpc.sprite.position.set(500, 300); // Onscreen
exp.getShips().push(testNpc);

gameLoop(1);
assert.strictEqual(testNpc.sprite.visible, true, 'Ship inside viewport (+ margin) must have visible = true');

// Move ship far offscreen
testNpc.sprite.position.set(2000, 2500);
gameLoop(1);
assert.strictEqual(testNpc.sprite.visible, false, 'Ship outside viewport (+ margin) must have visible = false');

// Move ship back into margin
testNpc.sprite.position.set(-50, 300); // Within CULL_MARGIN=80
gameLoop(1);
assert.strictEqual(testNpc.sprite.visible, true, 'Ship within margin must have visible = true');

// Check derelict ship culling
const derelict = sandbox.derelictShip || sandbox.window.derelictShip;
if (derelict && derelict.sprite) {
  derelict.sprite.position.set(5000, 5000);
  gameLoop(1);
  assert.strictEqual(derelict.sprite.visible, false, 'Derelict ship far offscreen must have visible = false');
  derelict.sprite.position.set(600, 300);
  gameLoop(1);
  assert.strictEqual(derelict.sprite.visible, true, 'Derelict ship onscreen must have visible = true');
}

console.log('✓ Offscreen ships and derelict correctly toggled visible = false/true for render culling');

console.log('\nALL PIXIJS V8 PARTICLECONTAINER & CULLING TESTS PASSED! 🌟🔫');
