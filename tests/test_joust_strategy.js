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

console.log('\nALL JOUST STRATEGY TESTS PASSED SUCCESSFULLY! ⚔️🚀');
