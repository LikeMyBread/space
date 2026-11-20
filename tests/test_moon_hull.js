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
      } else if (this._classes.has(c)) {
        this._classes.delete(c);
      } else {
        this._classes.add(c);
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
  click() { this.dispatch('click'); },
  blur() {},
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
});

const elements = {};
global.document = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = mockElement();
      if (id.includes('select')) {
        elements[id].value = '';
      }
    }
    return elements[id];
  },
  createElement: () => mockElement(),
};

global.window = {
  addEventListener: () => {},
};
global.performance = { now: () => Date.now() };

const mockPixiObject = () => ({
  position: { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } },
  pivot: { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } },
  scale: { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } },
  rotation: 0,
  visible: true,
  addChild: () => {},
  addChildAt: () => {},
  removeChild: () => {},
  destroy: () => {},
  clear: () => {},
  lineStyle: () => {},
  beginFill: () => {},
  endFill: () => {},
  drawCircle: () => {},
  drawRect: () => {},
  moveTo: () => {},
  lineTo: () => {},
});

global.PIXI = {
  Container: class {
    constructor() {
      this.children = [];
      Object.assign(this, mockPixiObject());
    }
    addChild(c) { this.children.push(c); return c; }
    addChildAt(c, idx) { this.children.splice(idx, 0, c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
      return c;
    }
  },
  Graphics: class {
    constructor() {
      Object.assign(this, mockPixiObject());
    }
  },
  Sprite: class {
    constructor() {
      Object.assign(this, mockPixiObject());
    }
    static from() { return new global.PIXI.Sprite(); }
  },
  ParticleContainer: class {
    constructor() {
      this.children = [];
      Object.assign(this, mockPixiObject());
    }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
      return c;
    }
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

let mainCode = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8');
mainCode = mainCode.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 15, height: 15 }) });');
mainCode = mainCode.replace('let app;', 'var app = global.app;');
mainCode = mainCode.replace(/init\(\)\.catch[\s\S]*$/, '');

let registeredTickerFn = null;
global.app = {
  stage: new PIXI.Container(),
  ticker: {
    add: (fn) => { registeredTickerFn = fn; },
    FPS: 60,
  }
};

const runCode = new Function(`
  ${mainCode}
  return {
    setup,
    buildShip,
    getEngineMounts,
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    WEAPONS_DATA,
    ASSET_PATHS,
    ACCEL_LIMIT,
  };
`);

const {
  setup,
  buildShip,
  getEngineMounts,
  HULLS_DATA,
  ENGINES_DATA,
  FACTION_PAINTS,
  WEAPONS_DATA,
  ASSET_PATHS,
  ACCEL_LIMIT,
} = runCode();

console.log('--- 1. Testing Moon Hull Definition in HULLS_DATA ---');
const moonHull = HULLS_DATA.find((h) => h.name === 'Moon');
assert(moonHull, 'Moon hull definition must exist in HULLS_DATA');
assert.strictEqual(moonHull.name, 'Moon', 'Hull name must be Moon');
assert.strictEqual(moonHull.img, 'img/ships/Moon.png', 'Hull graphic must be img/ships/Moon.png');
assert.strictEqual(moonHull.mass, 2601, 'Hull mass must be 2601 kg');
assert.strictEqual(moonHull.armor, 10, 'Hull armor must be 10');
assert.strictEqual(moonHull.hullRadius, 6, 'Hitbox radius must be 6px');
assert.strictEqual(moonHull.shieldRadius, 20, 'Shield radius must be 20px');
assert.deepStrictEqual(moonHull.pivot, { x: 7, y: 7 }, 'Pivot must be { x: 7, y: 7 } (center of 15x15 image)');
console.log('✓ Moon basic specifications verified (mass 2601 kg, armor 10, hitbox 6px, pivot 7,7)');

console.log('\n--- 2. Testing Moon Underneath Engine Mount ---');
assert(Array.isArray(moonHull.engine_mounts), 'engine_mounts must be an array');
assert.strictEqual(moonHull.engine_mounts.length, 1, 'Moon must have 1 engine mount');
assert.strictEqual(moonHull.engine_mounts[0].x, 7, 'Engine mount x must be 7');
assert.strictEqual(moonHull.engine_mounts[0].y, 12, 'Engine mount y must be 12');
assert.strictEqual(moonHull.engine_mounts[0].onTop, false, 'Engine mount must be underneath (onTop: false)');
assert.strictEqual(moonHull.engine_mount.x, 7, 'engine_mount fallback x must be 7');
assert.strictEqual(moonHull.engine_mount.y, 12, 'engine_mount fallback y must be 12');
assert.strictEqual(moonHull.engine_mount.onTop, false, 'engine_mount fallback must be onTop: false');
console.log('✓ Moon underneath engine mount verified at (7, 12) with onTop: false');

console.log('\n--- 3. Testing Moon Underneath Weapon Mounts ---');
assert(Array.isArray(moonHull.hardpoints), 'hardpoints must be an array');
assert.strictEqual(moonHull.hardpoints.length, 2, 'Moon must have 2 weapon mounts');

const hp1 = moonHull.hardpoints[0];
const hp2 = moonHull.hardpoints[1];
assert.strictEqual(hp1.location.x, 2, 'Hardpoint 1 x must be 2');
assert.strictEqual(hp1.location.y, 5, 'Hardpoint 1 y must be 5');
assert.strictEqual(hp1.onTop, false, 'Hardpoint 1 must be underneath (onTop: false)');

assert.strictEqual(hp2.location.x, 12, 'Hardpoint 2 x must be 12');
assert.strictEqual(hp2.location.y, 5, 'Hardpoint 2 y must be 5');
assert.strictEqual(hp2.onTop, false, 'Hardpoint 2 must be underneath (onTop: false)');
console.log('✓ Moon underneath weapon mounts verified at (2, 5) and (12, 5) with onTop: false');

console.log('\n--- 4. Testing ASSET_PATHS and index.html Options ---');
assert(ASSET_PATHS.includes('img/ships/Moon.png'), 'ASSET_PATHS must include img/ships/Moon.png');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
assert(html.includes('<option value="Moon">Moon</option>'), 'index.html body-select must contain Moon option');
console.log('✓ ASSET_PATHS and index.html dropdown option verified');

console.log('\n--- 5. Testing buildShip with Moon Hull ---');
const stdEngine = ENGINES_DATA.find((e) => e.name === 'thruster');
const bluePaint = FACTION_PAINTS[0];
const ship = buildShip(moonHull, stdEngine, bluePaint);

assert.strictEqual(ship.data.hull.name, 'Moon');
assert.strictEqual(ship.data.maxArmor, 10, 'Moon maxArmor must be 10');
assert.strictEqual(ship.data.hullHealth, 10, 'Moon hullHealth must be 10');
assert.strictEqual(ship.data.weapons.length, 2, 'Moon must be initialized with 2 weapons');
assert.strictEqual(ship.data.weapons[0].hardpoint.location.x, 2);
assert.strictEqual(ship.data.weapons[0].hardpoint.location.y, 5);
assert.strictEqual(ship.data.weapons[1].hardpoint.location.x, 12);
assert.strictEqual(ship.data.weapons[1].hardpoint.location.y, 5);

// Total mass: 2601 + 1500 = 4101 kg
const expectedMass = 2601 + stdEngine.mass;
const expectedAccel = (stdEngine.thrust * 1000) / expectedMass;
const expectedMaxSpeed = expectedAccel * ACCEL_LIMIT;
assert.strictEqual(expectedMass, 4101, 'Moon + thruster mass must be 4101 kg');
assert(Math.abs(ship.data.accel - expectedAccel) < 1e-6, 'Moon accel must match calculated value');
assert(Math.abs(ship.data.maxSpeed - expectedMaxSpeed) < 1e-6, 'Moon maxSpeed must match calculated value');
assert.strictEqual(ship.sprite.pivot.x, 7, 'Sprite pivot x must match Moon pivot x');
assert.strictEqual(ship.sprite.pivot.y, 7, 'Sprite pivot y must match Moon pivot y');
console.log(`✓ buildShip(Moon): mass=${expectedMass} kg, accel=${expectedAccel.toFixed(2)} m/s², maxSpeed=${expectedMaxSpeed.toFixed(2)} px/s`);

console.log('\n--- 6. Testing Player Ship Switch to Moon ---');
setup();
const playerShip = global.window.playerShip;
const bodySelect = elements['body-select'];
const statusMassVal = elements['status-mass-val'];
const armorVal = elements['armor-val'];
const armorBar = elements['armor-bar'];

bodySelect.value = 'Moon';
bodySelect.dispatch('change');

assert.strictEqual(playerShip.data.hull.name, 'Moon', 'Player hull should be Moon');
assert.strictEqual(playerShip.data.weapons.length, 2, 'Player should have 2 weapon slots on Moon');
assert.strictEqual(playerShip.data.weapons[0].hardpoint.onTop, false, 'Player weapon 1 must be underneath');
assert.strictEqual(playerShip.data.weapons[1].hardpoint.onTop, false, 'Player weapon 2 must be underneath');
assert.strictEqual(playerShip.data.maxArmor, 10, 'Player maxArmor should be 10');
assert.strictEqual(playerShip.data.hullHealth, 10, 'Player hullHealth should be 10');
assert.strictEqual(armorVal.textContent, '10 / 10', 'Armor display must read 10 / 10');
assert.strictEqual(armorBar.style.width, '100%', 'Armor bar must be 100%');

const expectedPlayerMassStr = (2601 + playerShip.data.engine.mass).toLocaleString() + ' kg';
assert.strictEqual(statusMassVal.textContent, expectedPlayerMassStr, `Status mass should be ${expectedPlayerMassStr}`);
console.log(`✓ Player loadout switched to Moon: mass = ${statusMassVal.textContent}, armor = ${armorVal.textContent}`);

console.log('\nALL MOON HULL TESTS PASSED!');
