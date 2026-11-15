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
  blur: () => {},
});

const domMap = new Map();
global.document = {
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

global.window = {
  addEventListener: () => {},
};

global.performance = { now: () => 1000 };

global.PIXI = {
  Application: class {
    async init() {
      this.canvas = mockElement();
      this.stage = new PIXI.Container();
      this.ticker = {
        add: (fn) => { this._fn = fn; },
        FPS: 60,
      };
    }
  },
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
  ParticleContainer: class {
    constructor(maxCount, properties) {
      this.maxCount = maxCount;
      this.properties = properties;
      this.children = [];
    }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
      return c;
    }
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
  },
  Assets: {
    load: async () => {},
    get: () => ({ width: 32, height: 32 }),
  },
  Texture: {
    from: () => ({}),
    WHITE: {},
  },
  RenderTexture: {
    create: () => ({}),
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
    projectiles,
    spawnProjectile,
    fireShipWeapons,
  };
`);

const exported = runCode();
const { setup, buildShip, ENGINES_DATA, projectiles } = exported;

setup();
const updateNpcCombat = global.window.updateNpcCombat;
const getStrategyDisplayName = global.window.getStrategyDisplayName;

console.log('--- 1. Testing Jousting Strategy Display Name ---');
assert.strictEqual(getStrategyDisplayName('joust'), 'JOUSTING');
assert.strictEqual(getStrategyDisplayName('joust', 'ATTACK RUN'), 'JOUSTING: ATTACK RUN');
assert.strictEqual(getStrategyDisplayName('joust', 'EXTENDING'), 'JOUSTING: EXTENDING');
console.log('✓ getStrategyDisplayName formats JOUSTING correctly');

console.log('--- 2. Testing Jousting Approaching Target -> ATTACK RUN ---');
// Build jouster and opponent
const jouster = buildShip();
jouster.data.combatStrategy = 'joust';
jouster.data.paint = { name: 'gold', hex: '#fbbf24' };
jouster.sprite.position.set(500, 500);
jouster.sprite.rotation = 0; // facing north
jouster.data.vx = 0;
jouster.data.vy = -jouster.data.maxSpeed; // charging north at max speed

const opponent = buildShip();
opponent.data.paint = { name: 'red', hex: '#ef4444' };
opponent.sprite.position.set(500, 300); // 200px north (ahead, approaching)
opponent.data.vx = 0;
opponent.data.vy = 0;
jouster.data.combatTarget = opponent;

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert.strictEqual(jouster.data.strategySubState, 'ATTACK RUN', 'Jouster approaching target from 200px must be in ATTACK RUN (not stuck in EXTENDING)');
console.log('✓ Jouster entering from 200px is immediately on ATTACK RUN');

console.log('--- 3. Testing Jousting Opens Fire Promptly During Inbound Approach ---');
// Position at 130px (within closing ballistic intercept range)
opponent.sprite.position.set(500, 370); // 130px north
jouster.data.weapons[0].lastFired = -Infinity;
jouster.data.weaponGroups = null;
const firedBefore = jouster.data.weapons[0].lastFired;

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert(jouster.data.weapons[0].lastFired > firedBefore, 'Jouster must open fire promptly during inbound attack run');
assert.strictEqual(jouster.data.strategySubState, 'ATTACK RUN', 'Jouster firing during approach must be in ATTACK RUN');
console.log('✓ Jouster opens fire promptly at 130px on inbound attack run');

console.log('--- 4. Testing Jousting Merge and Transition to EXTENDING ---');
// When the jouster passes the target and is separating (opponent is behind at 80px, radialSpeed > 5)
opponent.sprite.position.set(500, 580); // 80px south (behind jouster moving north)
opponent.data.vx = 0;
opponent.data.vy = 0;

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert.strictEqual(jouster.data.strategySubState, 'EXTENDING', 'Jouster separating past target must be in EXTENDING state');
console.log('✓ Jouster transitions to EXTENDING when separating past target');

console.log('--- 5. Testing Return to ATTACK RUN Once Separation Reverses ---');
// Jouster reverses course and begins closing again on opponent
jouster.sprite.position.set(500, 650);
jouster.sprite.rotation = Math.PI; // facing south back toward opponent at 500, 580
jouster.data.vx = 0;
jouster.data.vy = -10; // velocity turning around towards opponent (closing, radialSpeed <= 0)

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert.strictEqual(jouster.data.strategySubState, 'ATTACK RUN', 'Jouster closing on opponent must immediately switch back to ATTACK RUN');
console.log('✓ Jouster immediately switches back to ATTACK RUN as soon as closing on target');

console.log('--- 6. Testing Jousting Ship While Being Pursued Reverses Course Instead of Flying Backwards ---');
// Setup: Jouster at (500, 450) with velocity moving North at maxSpeed (vy = -maxSpeed)
// Pursuer is South at (500, 550) (100px away), pursuing North at vy = -maxSpeed
jouster.sprite.position.set(500, 450);
jouster.data.vx = 0;
jouster.data.vy = -jouster.data.maxSpeed;
jouster.sprite.rotation = Math.PI; // Facing South towards pursuing opponent

opponent.sprite.position.set(500, 550);
opponent.data.vx = 0;
opponent.data.vy = -jouster.data.maxSpeed;

const initialVy = jouster.data.vy;
updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);

// In ATTACK RUN, forwardSpeed is negative (moving North while facing South).
// Must apply forward thrust (South) to cancel backward drift!
assert.strictEqual(jouster.data.strategySubState, 'ATTACK RUN', 'Jouster must be in ATTACK RUN');
assert.strictEqual(jouster.data.engineLitSprite.visible, true, 'Jouster moving backwards must ignite main engine to reverse course');
assert(jouster.data.vy > initialVy, 'Forward thrust must decelerate backward motion (vy must become less negative)');
console.log('✓ Jouster moving backwards ignites forward thrust to brake and reverse course towards pursuer');

// Simulate 360 frames (6 seconds): with ACCEL_LIMIT = 5s, braking from -maxSpeed to 0 takes 5s.
// By 6s, velocity has completely reversed to positive South (vy > 0).
for (let f = 0; f < 360; f++) {
  // Keep opponent at 100px behind jouster moving at same speed so pursuit continues
  opponent.sprite.position.y = jouster.sprite.position.y + 100;
  opponent.data.vy = jouster.data.vy;
  updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
}
assert(jouster.data.vy > 0, `Velocity must have reversed to positive South (observed vy: ${jouster.data.vy.toFixed(1)})`);
console.log(`✓ Jouster successfully reversed course from backwards drift to forward charge (vy = ${jouster.data.vy.toFixed(1)} px/s)`);

console.log('--- 7. Testing Jousting Firing Calculations While in Range During Pursuit ---');
// Place jouster at (500, 500) and pursuer at (500, 600) (100px away, within 1.5x range of 131.25px)
// Both moving North at 80 px/s (jouster flying backwards facing pursuer South)
jouster.sprite.position.set(500, 500);
jouster.sprite.rotation = Math.PI; // Facing South
jouster.data.vx = 0;
jouster.data.vy = -80;

opponent.sprite.position.set(500, 600); // 100px away
opponent.data.vx = 0;
opponent.data.vy = -80;

jouster.data.weapons[0].lastFired = -Infinity;
jouster.data.weaponGroups = null;
const firedBefore100 = jouster.data.weapons[0].lastFired;

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert(jouster.data.weapons[0].lastFired > firedBefore100, 'Jouster must fire at pursuer within 100px range');
console.log('✓ Jouster continues firing at pursuer at 100px range');

// Test at 120px range (still within 1.5x weapon range of 131.25px)
opponent.sprite.position.set(500, 620); // 120px away
jouster.data.weapons[0].lastFired = -Infinity;
jouster.data.weaponGroups = null;
const firedBefore120 = jouster.data.weapons[0].lastFired;

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert(jouster.data.weapons[0].lastFired > firedBefore120, 'Jouster must fire at pursuer within 120px range');
console.log('✓ Jouster continues firing at pursuer at 120px range');

// Test at 145px range (beyond 1.5x range envelope of 131.25px) -> should NOT fire
jouster.sprite.position.set(500, 500);
jouster.data.vx = 0;
jouster.data.vy = -80;
opponent.sprite.position.set(500, 645); // 145px away
opponent.data.vx = 0;
opponent.data.vy = -80;
jouster.data.weapons[0].lastFired = -Infinity;
jouster.data.weaponGroups = null;
const firedBefore145 = jouster.data.weapons[0].lastFired;

updateNpcCombat(jouster, 1, 1/60, [jouster, opponent]);
assert.strictEqual(jouster.data.weapons[0].lastFired, firedBefore145, 'Jouster must NOT fire at 145px (beyond 1.5x range)');
console.log('✓ Jouster correctly withholds fire at 145px beyond range envelope');

console.log('\nALL JOUST STRATEGY TESTS PASSED SUCCESSFULLY! ⚔️🚀');
