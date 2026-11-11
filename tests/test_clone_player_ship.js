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
      if (force === undefined) {
        if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      } else if (force) {
        this._classes.add(c);
      } else {
        this._classes.delete(c);
      }
    },
  },
  _listeners: {},
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  dispatch(event) {
    if (this._listeners[event]) {
      for (const fn of this._listeners[event]) {
        fn({ target: this });
      }
    }
  },
  click() {
    this.dispatch('click');
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
    GAME_WIDTH,
    GAME_HEIGHT,
  };
`);

const exported = runCode();
const { setup, HULLS_DATA, ENGINES_DATA, FACTION_PAINTS, GAME_WIDTH, GAME_HEIGHT } = exported;

setup();

const playerShip = global.window.playerShip;
const ships = global.window.ships;

console.log('--- 1. Testing Clone Button & Strategy Dropdown Presence in index.html ---');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
assert(html.includes('id="clone-btn"'), 'index.html must contain button with id="clone-btn"');
assert(html.includes('>Clone</button>'), 'Clone button must display label "Clone"');
assert(html.includes('id="strategy-select"'), 'index.html must contain select with id="strategy-select"');
assert(html.includes('value="random"'), 'Strategy select must include random option');
assert(html.includes('value="turn_fight"'), 'Strategy select must include turn_fight option');
assert(html.includes('value="joust"'), 'Strategy select must include joust option');
assert(html.includes('value="standoff"'), 'Strategy select must include standoff option');
console.log('✓ Clone button and Strategy dropdown exist in index.html');

console.log('--- 2. Testing Clone Button Clones Custom Player Configuration ---');
const bodySelect = domMap.get('body-select');
const engineSelect = domMap.get('engine-select');
const paintSelect = domMap.get('paint-select');
const strategySelect = domMap.get('strategy-select');
const cloneBtn = domMap.get('clone-btn');
const fightBtn = domMap.get('fight-btn');
const reformBtn = domMap.get('reform-btn');
const shipCountEl = domMap.get('ship-count');

assert.strictEqual(strategySelect.value, 'random', 'Strategy selector should default to random');
assert.strictEqual(playerShip.data.combatStrategy, null, 'Default playerShip.data.combatStrategy should be null (random)');

// Customize player ship to Shadow hull (2 hardpoints), turbo_thruster engine, Blue paint, Standoff strategy
bodySelect.value = 'Shadow';
bodySelect.dispatch('change');
engineSelect.value = 'turbo_thruster';
engineSelect.dispatch('change');
paintSelect.value = 'Blue';
paintSelect.dispatch('change');
strategySelect.value = 'standoff';
strategySelect.dispatch('change');

assert.strictEqual(playerShip.data.hull.name, 'Shadow');
assert.strictEqual(playerShip.data.engine.name, 'turbo_thruster');
assert.strictEqual(playerShip.data.paint.name, 'Blue');
assert.strictEqual(playerShip.data.combatStrategy, 'standoff');
assert.strictEqual(playerShip.data.weapons.length, 2, 'Shadow hull should have 2 hardpoints/weapons');

// Simulate player having taken damage so we verify clone spawns fresh & healthy
playerShip.data.shield = 3;
playerShip.data.hullHealth = 4;

const initialNpcCount = ships.length;
cloneBtn.click();

assert.strictEqual(ships.length, initialNpcCount + 1, 'Clicking Clone must spawn 1 new NPC ship');
const clone = ships[ships.length - 1];
assert(clone && clone.data, 'Cloned ship must exist');
assert.notStrictEqual(clone.data.id, playerShip.data.id, 'Clone must receive a unique ship ID');

// Configuration identity checks
assert.strictEqual(clone.data.hull.name, 'Shadow', 'Clone hull must match player hull (Shadow)');
assert.strictEqual(clone.data.engine.name, 'turbo_thruster', 'Clone engine must match player engine (turbo_thruster)');
assert.strictEqual(clone.data.paint.name, 'Blue', 'Clone paint must match player paint (Blue)');
assert.strictEqual(clone.data.combatStrategy, 'standoff', 'Clone combatStrategy must match player strategy (standoff)');
assert.strictEqual(clone.data.hasFixedStrategy, true, 'Clone with explicit strategy must have hasFixedStrategy flag');
assert.strictEqual(clone.data.accel, playerShip.data.accel, 'Clone accel must match player accel');
assert.strictEqual(clone.data.maxSpeed, playerShip.data.maxSpeed, 'Clone maxSpeed must match player maxSpeed');
assert.strictEqual(clone.sprite.pivot.x, playerShip.sprite.pivot.x, 'Clone pivot.x must match player pivot.x');
assert.strictEqual(clone.sprite.pivot.y, playerShip.sprite.pivot.y, 'Clone pivot.y must match player pivot.y');

// Weapons cloned independently
assert.strictEqual(clone.data.weapons.length, 2, 'Clone must have same number of weapons as player');
for (let i = 0; i < clone.data.weapons.length; i++) {
  assert.notStrictEqual(clone.data.weapons[i], playerShip.data.weapons[i], 'Clone weapon slots must be distinct objects');
  assert.strictEqual(clone.data.weapons[i].weapon, playerShip.data.weapons[i].weapon, 'Clone weapon definition must match player');
  assert.strictEqual(clone.data.weapons[i].hardpoint, playerShip.data.weapons[i].hardpoint, 'Clone hardpoint must match player');
  assert.strictEqual(clone.data.weapons[i].lastFired, -Infinity, 'Clone weapon cooldown must start ready');
}

// Health/shield freshness & spawn bounds
assert.strictEqual(clone.data.shield, clone.data.maxShield, 'Clone shields must spawn at full strength');
assert.strictEqual(clone.data.hullHealth, clone.data.maxHullHealth, 'Clone hullHealth must spawn at full strength');
assert.strictEqual(clone.data.isDisabled, false, 'Clone must not spawn disabled');
assert(clone.sprite.x >= 0 && clone.sprite.x <= GAME_WIDTH, 'Clone x must be within viewport');
assert(clone.sprite.y >= 0 && clone.sprite.y <= GAME_HEIGHT, 'Clone y must be within viewport');
assert(global.app.stage.children.includes(clone.sprite), 'Clone sprite must be added to stage');
assert.strictEqual(shipCountEl.textContent, (ships.length + 1).toLocaleString(), 'Ship count UI must update');
console.log('✓ Clone spawns NPC with identical hull, engine, paint, weapons, strategy, and physics specs');

console.log('--- 3. Testing Fleet Integration, Fight/Re-form Persistence & Mid-Combat Cloning ---');
// Not fighting: clone joins same-color fleet around player (since player ID is 1, lowest Blue ID)
assert.strictEqual(clone.data.formationLeader, playerShip, 'Out of combat, clone of player color should join fleet under player leader');

// Verify Fight! and Re-form Fleet preserve customized strategy
fightBtn.click();
assert.strictEqual(clone.data.combatStrategy, 'standoff', 'Fight! must preserve cloned standoff strategy');
reformBtn.click();
assert.strictEqual(clone.data.combatStrategy, 'standoff', 'Re-form Fleet must preserve cloned fixed strategy');

// During combat (isFighting = true): clone spawns with explicit Joust strategy
paintSelect.value = 'Green';
paintSelect.dispatch('change');
strategySelect.value = 'joust';
strategySelect.dispatch('change');
fightBtn.click();
const joustClone = global.window.clonePlayerShip();
assert(joustClone, 'clonePlayerShip() must return the cloned ship');
assert.strictEqual(joustClone.data.paint.name, 'Green', 'Mid-combat clone must copy updated player paint');
assert.strictEqual(joustClone.data.aiState, 'COMBAT', 'Mid-combat clone must enter COMBAT state immediately');
assert.strictEqual(joustClone.data.combatStrategy, 'joust', 'Mid-combat clone must keep explicit joust strategy');

// Switch back to Random strategy and clone mid-combat -> assigns random strategy
strategySelect.value = 'random';
strategySelect.dispatch('change');
assert.strictEqual(playerShip.data.combatStrategy, null, 'Random selection sets combatStrategy back to null');
const randomClone = global.window.clonePlayerShip();
assert(!randomClone.data.hasFixedStrategy, 'Random clone must not have fixed strategy flag');
assert(['turn_fight', 'joust', 'standoff'].includes(randomClone.data.combatStrategy), 'Random mid-combat clone must be assigned a random combat strategy');
console.log('✓ Strategy menu accurately customizes clones across idle, fleet re-form, and mid-combat spawns');

console.log('\nALL CLONE PLAYER SHIP TESTS PASSED SUCCESSFULLY! 🚀♊');
