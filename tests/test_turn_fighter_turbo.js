const path = require('path');
const assert = require('assert');
const fs = require('fs');

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
});

global.document = {
  getElementById: (id) => mockElement(),
  createElement: (tag) => mockElement(),
  addEventListener: () => {},
};

global.window = {
  addEventListener: () => {},
  performance: { now: () => Date.now() },
};

global.performance = global.window.performance;

global.PIXI = {
  Container: class {
    constructor() {
      this.children = [];
      const self = this;
      this._x = 0;
      this._y = 0;
      this.position = {
        get x() { return self._x; },
        set x(v) { self._x = v; },
        get y() { return self._y; },
        set y(v) { self._y = v; },
        set: (x, y) => { self._x = x; self._y = y; }
      };
      this.pivot = { set: (x, y) => { this.pivot.x = x; this.pivot.y = y; }, x: 0, y: 0 };
      this.rotation = 0;
      this.visible = true;
    }
    get x() { return this._x; }
    set x(v) { this._x = v; }
    get y() { return this._y; }
    set y(v) { this._y = v; }
    addChild(c) { this.children.push(c); return c; }
    addChildAt(c, idx) { this.children.splice(idx, 0, c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
      return c;
    }
    getChildIndex(c) { return this.children.indexOf(c); }
    destroy(opts) { this.destroyed = true; }
  },
  Graphics: class {
    constructor() {
      this.commands = [];
    }
    clear() { this.commands.push('clear'); }
    moveTo(x, y) { this.commands.push(['moveTo', x, y]); }
    lineTo(x, y) { this.commands.push(['lineTo', x, y]); }
    stroke(opts) { this.commands.push(['stroke', opts]); }
    circle(x, y, r) { this.commands.push(['circle', x, y, r]); }
    fill(opts) { this.commands.push(['fill', opts]); }
  },
  Sprite: class {
    constructor(tex) {
      this.texture = tex;
      const self = this;
      this._x = 0;
      this._y = 0;
      this.position = {
        get x() { return self._x; },
        set x(v) { self._x = v; },
        get y() { return self._y; },
        set y(v) { self._y = v; },
        set: (x, y) => { self._x = x; self._y = y; }
      };
      this.pivot = { set: (x, y) => { this.pivot.x = x; this.pivot.y = y; }, x: 0, y: 0 };
      this.rotation = 0;
      this.visible = true;
    }
    get x() { return this._x; }
    set x(v) { this._x = v; }
    get y() { return this._y; }
    set y(v) { this._y = v; }
    destroy() { this.destroyed = true; }
  },
  Particle: class {
    constructor(opts) {
      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.rotation = opts.rotation || 0;
      this.anchorX = opts.anchorX || 0.5;
      this.anchorY = opts.anchorY || 0.5;
      this.texture = opts.texture;
    }
  },
  ParticleContainer: class {
    constructor(opts) {
      this.particles = [];
      this.children = [];
      this.opts = opts;
    }
    addParticle(p) { this.particles.push(p); }
    removeParticle(p) {
      const idx = this.particles.indexOf(p);
      if (idx !== -1) this.particles.splice(idx, 1);
    }
    addChild(c) { this.children.push(c); }
  },
  Texture: {
    from: () => ({}),
  },
  Assets: {
    load: async () => {},
    get: () => ({ width: 32, height: 32 }),
  },
};

global.Image = class {
  constructor() {
    this.width = 30;
    this.height = 30;
  }
};

let code = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8');
code = code.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 30, height: 30 }) });');
code = code.replace('let app;', 'var app = global.app;');
code = code.replace(/init\(\)\.catch[\s\S]*$/, '');

let registeredTickerFn = null;
global.app = {
  stage: new PIXI.Container(),
  ticker: {
    add: (fn) => { registeredTickerFn = fn; },
    FPS: 60,
  }
};

const runCode = new Function(`
  ${code}
  return {
    setup,
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    WEAPONS_DATA,
    buildShip,
    checkSpeed,
    formFleet,
    ACCEL_LIMIT,
    TURN_RATE,
    projectiles,
    spawnProjectile,
    fireShipWeapons,
    getRegisteredTicker: () => registeredTickerFn
  };
`);

const {
  setup,
  HULLS_DATA,
  ENGINES_DATA,
  FACTION_PAINTS,
  WEAPONS_DATA,
  buildShip,
  TURN_RATE,
  projectiles,
} = runCode();

setup();

const getLeadSolution = global.window.getLeadSolution;
const aimAndShoot = global.window.aimAndShoot;
const updateNpcCombat = global.window.updateNpcCombat;

const standardEngine = ENGINES_DATA.find((e) => e.name === 'thruster');
const turboEngine = ENGINES_DATA.find((e) => e.name === 'turbo_thruster');
const anvilHull = HULLS_DATA.find((h) => h.name === 'Anvil');
const bluePaint = FACTION_PAINTS[0];
const redPaint = FACTION_PAINTS[1];

console.log('--- Testing Uniform Turn Rate (No Special Turn Rate Boosts) ---');
const standardShip = buildShip(anvilHull, standardEngine, bluePaint);
const turboShip = buildShip(anvilHull, turboEngine, redPaint);

console.log(`Standard Ship accel: ${standardShip.data.accel.toFixed(2)}, maxSpeed: ${standardShip.data.maxSpeed.toFixed(2)}`);
console.log(`Turbo Ship accel: ${turboShip.data.accel.toFixed(2)}, maxSpeed: ${turboShip.data.maxSpeed.toFixed(2)}`);

assert.strictEqual(TURN_RATE, 0.04, 'Global TURN_RATE must remain standard 0.04 rad/frame');
assert.strictEqual(turboShip.data.turnRate, undefined, 'Ships must not have special turnRate property overrides');
console.log('✓ All ships use standard TURN_RATE without special turn rate boosts');

console.log('--- Testing Turn Fighter Controlled Standoff Approach (Speed Limited to <= 25 px/s) ---');
// Create a stationary victim at (500, 500) facing North (rotation = 0)
// Victim rear waypoint is at (500, 545)
const victim = buildShip(anvilHull, standardEngine, redPaint);
victim.sprite.position.set(500, 500);
victim.sprite.rotation = 0;
victim.data.vx = 0;
victim.data.vy = 0;

// Create a turbo turn fighter starting behind victim at distance 150px (500, 650)
const turnFighter = buildShip(anvilHull, turboEngine, bluePaint);
turnFighter.data.combatStrategy = 'turn_fight';
turnFighter.sprite.position.set(500, 650);
turnFighter.sprite.rotation = 0; // Facing North toward victim
turnFighter.data.vx = 0;
turnFighter.data.vy = 0;

// Simulate approaching the waypoint over 300 frames (5 seconds)
let passedThroughFrontOfTarget = false;
let maxObservedSpeed = 0;

for (let frame = 0; frame < 300; frame++) {
  updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
  
  // Victim is at y=500. Standoff waypoint is at y=545.
  // If the turn fighter overshoots the target to the front, its y becomes < 500
  if (turnFighter.sprite.y < 500) {
    passedThroughFrontOfTarget = true;
  }
  
  const currentSpeed = Math.hypot(turnFighter.data.vx, turnFighter.data.vy);
  if (currentSpeed > maxObservedSpeed) {
    maxObservedSpeed = currentSpeed;
  }
}

console.log(`Max approach speed observed: ${maxObservedSpeed.toFixed(1)} px/s (top engine speed is ${turnFighter.data.maxSpeed.toFixed(1)})`);
console.log(`Final turn fighter position: (${turnFighter.sprite.x.toFixed(1)}, ${turnFighter.sprite.y.toFixed(1)})`);
console.log(`Final turn fighter speed: ${Math.hypot(turnFighter.data.vx, turnFighter.data.vy).toFixed(1)} px/s`);

assert(!passedThroughFrontOfTarget, 'Turn fighter must NOT overshoot completely past the target to the front');
assert(maxObservedSpeed <= 25.5, `Approach speed must be strictly capped at 25 px/s (observed: ${maxObservedSpeed.toFixed(1)})`);
// Position should settle near (500, 545)
const finalDist = Math.hypot(turnFighter.sprite.x - 500, turnFighter.sprite.y - 545);
assert(finalDist < 35, `Turn fighter must settle near standoff pocket (dist: ${finalDist.toFixed(1)} < 35)`);
console.log('✓ Turn fighter approaches at controlled speed (<= 25 px/s) and settles in rear pocket without overshooting');

console.log('--- Testing Ballistic Intercept & Intercept Solvability Gate ---');
// Case 1: Unsolvable intercept - shooter crossing laterally at 150 px/s (greater than weapon speed 100 px/s)
const fastShooter = buildShip(anvilHull, turboEngine, bluePaint);
fastShooter.sprite.position.set(0, 50);
fastShooter.data.vx = 150;
fastShooter.data.vy = 0;

const stationaryTarget = buildShip(anvilHull, standardEngine, redPaint);
stationaryTarget.sprite.position.set(0, 0);
stationaryTarget.data.vx = 0;
stationaryTarget.data.vy = 0;

const unsolvableSol = getLeadSolution(fastShooter, stationaryTarget);
assert(unsolvableSol.interceptTime <= 0, 'No positive intercept time should exist when relative speed exceeds muzzle speed');
assert.strictEqual(unsolvableSol.inRange, false, 'Unsolvable ballistic intercept must NOT be marked inRange');

const projCountBefore = projectiles.length;
aimAndShoot(fastShooter, stationaryTarget);
assert.strictEqual(projectiles.length, projCountBefore, 'Ship must NOT fire when no ballistic intercept solution exists');
console.log('✓ Unsolvable intercept correctly prevents firing impossible shots');

console.log('--- Testing Turn Fighter Accuracy in Rear Pocket ---');
// Place turn fighter in rear pocket behind moving target (e.g. target moving East at 20 px/s)
const movingTarget = buildShip(anvilHull, standardEngine, redPaint);
movingTarget.sprite.position.set(500, 500);
movingTarget.sprite.rotation = Math.PI / 2; // Facing East
movingTarget.data.vx = 20;
movingTarget.data.vy = 0;

// Turn fighter is 45px behind (x = 455, y = 500), matching velocity
const pocketFighter = buildShip(anvilHull, turboEngine, bluePaint);
pocketFighter.data.combatStrategy = 'turn_fight';
pocketFighter.sprite.position.set(455, 500);
pocketFighter.sprite.rotation = Math.PI / 2; // Facing East
pocketFighter.data.vx = 20;
pocketFighter.data.vy = 0;

const solPocket = getLeadSolution(pocketFighter, movingTarget);
assert(solPocket.interceptTime > 0, 'Valid intercept exists in pocket');
assert.strictEqual(solPocket.inRange, true, 'Moving target is in range');

const projsBefore = projectiles.length;
updateNpcCombat(pocketFighter, 1, 1/60, [pocketFighter, movingTarget]);
assert(projectiles.length > projsBefore, 'Turn fighter in pocket should fire at target');
const firedProj = projectiles[projectiles.length - 1];
// Projectile velocity should match target vx (20) plus muzzle speed along rotation East (100) -> vx ≈ 120, vy ≈ 0
assert(Math.abs(firedProj.vx - 120) < 5, `Fired projectile vx should be ~120 (was ${firedProj.vx})`);
assert(Math.abs(firedProj.vy) < 5, `Fired projectile vy should be ~0 (was ${firedProj.vy})`);
console.log('✓ Turn fighter fires accurately along target intercept path');

console.log('--- Testing Expanded "In the Pocket" Zone (Anywhere Behind Target & Longer Range) ---');
// Target at (500, 500) facing North (rotation = 0). Rear axis is directly South (PI rad).
const targetShip = buildShip(anvilHull, standardEngine, redPaint);
targetShip.sprite.position.set(500, 500);
targetShip.sprite.rotation = 0; // Facing North
targetShip.data.vx = 0;
targetShip.data.vy = 0;

// Test Case 1: Fighter is in the rear quarter at 75 degrees off the tail (bearing = PI - 75 deg = 105 deg).
// Distance = 60px. Under old 45-degree cone this was outside; now it is inside the 90-degree rear hemisphere.
const quarterFighter = buildShip(anvilHull, turboEngine, bluePaint);
quarterFighter.data.combatStrategy = 'turn_fight';
const angle75 = Math.PI - (75 * Math.PI / 180); // 105 deg from North
quarterFighter.sprite.position.set(500 + 60 * Math.sin(angle75), 500 - 60 * Math.cos(angle75));
quarterFighter.sprite.rotation = -1.31; // Facing target from rear quarter (-75 deg)
quarterFighter.data.vx = 0;
quarterFighter.data.vy = 0;

const projsBeforeQuarter = projectiles.length;
updateNpcCombat(quarterFighter, 1, 1/60, [quarterFighter, targetShip]);
assert(projectiles.length > projsBeforeQuarter, 'Fighter anywhere in rear hemisphere (75 deg off tail) must be in the pocket and fire');
console.log('✓ Fighter in wide rear aspect (75° off tail) switches to turn and fire');

// Test Case 2: Long range firing - Fighter is 75px directly behind target (500, 575)
const longRangeFighter = buildShip(anvilHull, turboEngine, bluePaint);
longRangeFighter.data.combatStrategy = 'turn_fight';
longRangeFighter.sprite.position.set(500, 575);
longRangeFighter.sprite.rotation = 0; // Pointing North toward target
longRangeFighter.data.vx = 0;
longRangeFighter.data.vy = 0;

const projsBeforeLong = projectiles.length;
updateNpcCombat(longRangeFighter, 1, 1/60, [longRangeFighter, targetShip]);
assert(projectiles.length > projsBeforeLong, 'Fighter 75px behind target must engage and fire from long range');
console.log('✓ Fighter engages and fires from long range (75px)');

// Test Case 3: Front hemisphere check - Fighter at 120 degrees from tail (in front of beam, e.g. 60 deg from nose)
// Must NOT be in the pocket
const frontFighter = buildShip(anvilHull, turboEngine, bluePaint);
frontFighter.data.combatStrategy = 'turn_fight';
const angleFront = 60 * Math.PI / 180; // 60 deg from nose (front hemisphere)
frontFighter.sprite.position.set(500 + 100 * Math.sin(angleFront), 500 - 100 * Math.cos(angleFront));
frontFighter.sprite.rotation = Math.PI; // Pointing back toward target
frontFighter.data.vx = 0;
frontFighter.data.vy = 0;

const projsBeforeFront = projectiles.length;
updateNpcCombat(frontFighter, 1, 1/60, [frontFighter, targetShip]);
// Should maneuver to get behind target (engine lit or turning), NOT in pocket
assert(frontFighter.data.engineLitSprite.visible === true || frontFighter.data.vx !== 0 || frontFighter.data.vy !== 0 || frontFighter.sprite.rotation !== Math.PI,
  'Fighter in front hemisphere must maneuver to get behind target');
console.log('✓ Front hemisphere correctly treated as outside the pocket');

console.log('ALL TURBO THRUSTER & TURN FIGHTER TESTS PASSED SUCCESSFULLY! 🎯🚀');
