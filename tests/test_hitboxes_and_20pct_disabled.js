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
    toggle(c, force) {
      if (force !== undefined) {
        if (force) this._classes.add(c);
        else this._classes.delete(c);
        return force;
      }
      if (this._classes.has(c)) {
        this._classes.delete(c);
        return false;
      } else {
        this._classes.add(c);
        return true;
      }
    }
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
    addParticle(p) { this.children.push(p); return p; }
    removeParticle(p) {
      const idx = this.children.indexOf(p);
      if (idx !== -1) this.children.splice(idx, 1);
      return p;
    }
  },
  Particle: class {
    constructor(opts) {
      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.rotation = opts.rotation || 0;
      this.texture = opts.texture;
    }
  },
  Graphics: class {
    constructor() {
      this.commands = [];
    }
    clear() { this.commands.push(['clear']); }
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
    DISABLED_ARMOR_THRESHOLD,
    projectiles,
    spawnProjectile,
    fireShipWeapons,
  };
`);

const exported = runCode();
const { setup, buildShip, DISABLED_ARMOR_THRESHOLD, projectiles } = exported;

setup();
const gameLoop = global.window.gameLoop;
const playerShip = global.window.playerShip;
const derelictShip = global.window.derelictShip;
const updateNpcCombat = global.window.updateNpcCombat;
const updateHitboxGraphics = global.window.updateHitboxGraphics;
const hitboxGraphics = global.window.hitboxGraphics;

console.log('--- 1. Testing 20% Armor Disabling Threshold ---');
assert.strictEqual(DISABLED_ARMOR_THRESHOLD, 0.2, 'DISABLED_ARMOR_THRESHOLD should be 0.2 (20%)');

const testShip = buildShip();
testShip.data.hullHealth = 2.5; // 25% of 10 -> NOT disabled
testShip.data.maxHullHealth = 10;
testShip.data.maxArmor = 10;
testShip.data.isDisabled = false;

// Above 20%: not disabled
updateNpcCombat(testShip, 1, 1/60, [testShip, playerShip]);
assert.strictEqual(testShip.data.isDisabled, false, 'Ship with 25% armor must NOT be disabled');

// At exactly 20% (2.0 / 10): disabled!
testShip.data.hullHealth = 2.0;
updateNpcCombat(testShip, 1, 1/60, [testShip, playerShip]);
assert.strictEqual(testShip.data.isDisabled, true, 'Ship with exactly 20% armor must be disabled');
assert.strictEqual(testShip.data.aiState, 'DISABLED', 'aiState must be set to DISABLED');

// Below 20% (1.5 / 10): disabled!
testShip.data.hullHealth = 1.5;
testShip.data.isDisabled = false;
updateNpcCombat(testShip, 1, 1/60, [testShip, playerShip]);
assert.strictEqual(testShip.data.isDisabled, true, 'Ship with 15% armor must be disabled');

// Player ship disabled at 20% armor in gameLoop
playerShip.data.hullHealth = 2.0;
global.window.isGodMode = false;
gameLoop(1);
assert.strictEqual(playerShip.data.isDisabled, true, 'Player ship must become disabled at 20% armor');
playerShip.data.hullHealth = 10;
playerShip.data.isDisabled = false;

// Derelict ship disabled at 20% armor
if (derelictShip) {
  derelictShip.data.hullHealth = 2.0;
  gameLoop(1);
  assert.strictEqual(derelictShip.data.isDisabled, true, 'Derelict ship must become disabled at 20% armor');
  derelictShip.data.hullHealth = 10;
  derelictShip.data.isDisabled = false;
}

console.log('✓ Disabling threshold successfully raised to 20% across NPC, player, and derelict ships');

console.log('--- 2. Testing Hitbox Button in Simulation Controls ---');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
assert(html.includes('id="hitbox-btn"'), 'index.html must contain id="hitbox-btn"');
assert(html.includes('btn-hitbox'), 'index.html must contain class="btn btn-hitbox"');
assert(html.includes('Hitboxes: OFF'), 'index.html must contain initial label "Hitboxes: OFF"');

const hitboxBtnEl = domMap.get('hitbox-btn');
hitboxBtnEl.textContent = 'Hitboxes: OFF';
assert(hitboxBtnEl, 'Hitbox button (#hitbox-btn) must exist in DOM');
assert.strictEqual(hitboxBtnEl.textContent, 'Hitboxes: OFF', 'Initial button text must be Hitboxes: OFF');
assert.strictEqual(global.window.showHitboxes, false, 'Initial showHitboxes must be false');

// Click to turn ON
hitboxBtnEl.click();
assert.strictEqual(global.window.showHitboxes, true, 'showHitboxes must be true after clicking');
assert.strictEqual(hitboxBtnEl.textContent, 'Hitboxes: ON', 'Button text must update to Hitboxes: ON');
assert(hitboxBtnEl.classList.contains('active'), 'Button must have active class when ON');

// Click to turn OFF
hitboxBtnEl.click();
assert.strictEqual(global.window.showHitboxes, false, 'showHitboxes must be false after second click');
assert.strictEqual(hitboxBtnEl.textContent, 'Hitboxes: OFF', 'Button text must update to Hitboxes: OFF');
assert(!hitboxBtnEl.classList.contains('active'), 'Button must not have active class when OFF');

// Programmatic toggle via window.showHitboxes
global.window.showHitboxes = true;
assert.strictEqual(hitboxBtnEl.textContent, 'Hitboxes: ON', 'window.showHitboxes setter updates button text');
assert(hitboxBtnEl.classList.contains('active'), 'window.showHitboxes setter updates active class');
console.log('✓ Hitbox button toggles state, UI classes, and window.showHitboxes correctly');

console.log('--- 3. Testing Hull Hitbox Drawing (Red Circles with hullRadius) ---');
assert(hitboxGraphics, 'hitboxGraphics PIXI.Graphics overlay must exist');

// Clear commands and run with showHitboxes = true
global.window.showHitboxes = true;
hitboxGraphics.commands = [];
updateHitboxGraphics();

// Check that circle commands were recorded with proper parameters
const circleCommands = hitboxGraphics.commands.filter(cmd => cmd[0] === 'circle');
assert(circleCommands.length > 0, 'Must draw circles for active ships');

const activeShips = [playerShip, derelictShip, ...(global.window.ships || [])].filter(
  s => s && s.sprite && s.data && !s.data.isDestroyed
);

for (const cmd of circleCommands) {
  const [_, cx, cy, r] = cmd;
  const matchingShip = activeShips.find(
    s => Math.abs(s.sprite.x - cx) < 0.001 && Math.abs(s.sprite.y - cy) < 0.001
  );
  assert(matchingShip, `Rendered hitbox circle at (${cx}, ${cy}) must correspond to an active ship`);
  assert.strictEqual(
    r,
    matchingShip.data.hull.hullRadius,
    `Hull radius for ${matchingShip.data.hull.name} should be ${matchingShip.data.hull.hullRadius}, got ${r}`
  );
}

const strokeCommands = hitboxGraphics.commands.filter(cmd => cmd[0] === 'stroke');
assert(strokeCommands.length > 0, 'Must stroke red circles');
assert.strictEqual(strokeCommands[0][1].color, 0xef4444, 'Stroke color must be red (0xef4444)');

// When toggled OFF, graphics should clear without drawing
global.window.showHitboxes = false;
hitboxGraphics.commands = [];
updateHitboxGraphics();
assert.strictEqual(hitboxGraphics.commands.length, 1, 'Only clear command should be called when OFF');
assert.strictEqual(hitboxGraphics.commands[0][0], 'clear');

console.log('✓ Red hull hitbox circles rendered accurately with each ship hull\'s exact hullRadius and cleared when OFF');

console.log('\nALL HITBOX & 20% DISABLED TESTS PASSED! 🔴🛡️');
