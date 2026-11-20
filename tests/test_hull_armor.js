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
mainCode = mainCode.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 30, height: 30 }) });');
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
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    DISABLED_ARMOR_THRESHOLD,
  };
`);

const {
  setup,
  buildShip,
  HULLS_DATA,
  ENGINES_DATA,
  FACTION_PAINTS,
  DISABLED_ARMOR_THRESHOLD,
} = runCode();

console.log('--- 1. Testing HULLS_DATA Armor Values ---');
const expectedArmor = {
  Hammer: 100,
  Boat: 40,
  Moon: 10,
  Anvil: 10,
  Avocado: 10,
  Crab: 10,
  Delta: 10,
  Protogon: 10,
  Shadow: 10,
  Shuttle: 10,
  Skate: 10,
};

assert.strictEqual(HULLS_DATA.length, 11, 'Expected 11 hulls in HULLS_DATA');

for (const [name, armorVal] of Object.entries(expectedArmor)) {
  const hull = HULLS_DATA.find((h) => h.name === name);
  assert(hull, `Hull "${name}" must exist in HULLS_DATA`);
  assert.strictEqual(
    hull.armor,
    armorVal,
    `Hull "${name}" armor must be ${armorVal}, found ${hull.armor}`
  );
  console.log(`✓ ${name.padEnd(10)}: armor = ${hull.armor}`);
}

console.log('\n--- 2. Testing buildShip Armor Initialization Across All Hulls ---');
for (const hull of HULLS_DATA) {
  const ship = buildShip(hull, ENGINES_DATA[0], FACTION_PAINTS[0]);
  assert.strictEqual(ship.data.armor, hull.armor, `${hull.name} armor must equal hull.armor`);
  assert.strictEqual(ship.data.maxArmor, hull.armor, `${hull.name} maxArmor must equal hull.armor`);
  assert.strictEqual(ship.data.hullHealth, hull.armor, `${hull.name} hullHealth must equal hull.armor`);
  assert.strictEqual(ship.data.maxHullHealth, hull.armor, `${hull.name} maxHullHealth must equal hull.armor`);
  console.log(`✓ buildShip(${hull.name}): maxArmor=${ship.data.maxArmor}, hullHealth=${ship.data.hullHealth}`);
}

console.log('\n--- 3. Testing Player Ship Hull Switching & Status UI Updates ---');
setup();
const playerShip = global.window.playerShip;
const bodySelect = elements['body-select'];
const armorValEl = elements['armor-val'];
const armorBarEl = elements['armor-bar'];

// Switch player to Hammer (100 armor)
bodySelect.value = 'Hammer';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Hammer', 'Player hull should be Hammer');
assert.strictEqual(playerShip.data.maxArmor, 100, 'Player maxArmor should be 100');
assert.strictEqual(playerShip.data.maxHullHealth, 100, 'Player maxHullHealth should be 100');
assert.strictEqual(playerShip.data.hullHealth, 100, 'Player hullHealth should be 100');
assert.strictEqual(armorValEl.textContent, '100 / 100', 'Status armorVal should display "100 / 100"');
assert.strictEqual(armorBarEl.style.width, '100%', 'Status armorBar width should be 100%');
console.log('✓ Player switched to Hammer: 100 / 100 armor, 100% bar');

// Switch player to Boat (40 armor)
bodySelect.value = 'Boat';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Boat', 'Player hull should be Boat');
assert.strictEqual(playerShip.data.maxArmor, 40, 'Player maxArmor should be 40');
assert.strictEqual(playerShip.data.maxHullHealth, 40, 'Player maxHullHealth should be 40');
assert.strictEqual(playerShip.data.hullHealth, 40, 'Player hullHealth should be 40');
assert.strictEqual(armorValEl.textContent, '40 / 40', 'Status armorVal should display "40 / 40"');
assert.strictEqual(armorBarEl.style.width, '100%', 'Status armorBar width should be 100%');
console.log('✓ Player switched to Boat: 40 / 40 armor, 100% bar');

// Switch player to Shuttle (10 armor)
bodySelect.value = 'Shuttle';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Shuttle', 'Player hull should be Shuttle');
assert.strictEqual(playerShip.data.maxArmor, 10, 'Player maxArmor should be 10');
assert.strictEqual(playerShip.data.maxHullHealth, 10, 'Player maxHullHealth should be 10');
assert.strictEqual(playerShip.data.hullHealth, 10, 'Player hullHealth should be 10');
assert.strictEqual(armorValEl.textContent, '10 / 10', 'Status armorVal should display "10 / 10"');
assert.strictEqual(armorBarEl.style.width, '100%', 'Status armorBar width should be 100%');
console.log('✓ Player switched to Shuttle: 10 / 10 armor, 100% bar');

console.log('\n--- 4. Testing Disabling Threshold (20% of maxArmor) ---');
const hammerHull = HULLS_DATA.find((h) => h.name === 'Hammer');
const boatHull = HULLS_DATA.find((h) => h.name === 'Boat');
const deltaHull = HULLS_DATA.find((h) => h.name === 'Delta');

const hammerShip = buildShip(hammerHull, ENGINES_DATA[0], FACTION_PAINTS[0]);
const boatShip = buildShip(boatHull, ENGINES_DATA[0], FACTION_PAINTS[0]);
const deltaShip = buildShip(deltaHull, ENGINES_DATA[0], FACTION_PAINTS[0]);

const updateNpcCombat = global.window.updateNpcCombat;

// Hammer (100 armor): disabled at <= 20
hammerShip.data.hullHealth = 25; // 25% > 20%
updateNpcCombat(hammerShip, 1, 1/60, [hammerShip, playerShip]);
assert.strictEqual(hammerShip.data.isDisabled, false, 'Hammer at 25 armor must NOT be disabled');

hammerShip.data.hullHealth = 20; // 20%
updateNpcCombat(hammerShip, 1, 1/60, [hammerShip, playerShip]);
assert.strictEqual(hammerShip.data.isDisabled, true, 'Hammer at 20 armor MUST be disabled');

// Boat (40 armor): disabled at <= 8
boatShip.data.hullHealth = 10; // 25% > 20%
updateNpcCombat(boatShip, 1, 1/60, [boatShip, playerShip]);
assert.strictEqual(boatShip.data.isDisabled, false, 'Boat at 10 armor must NOT be disabled');

boatShip.data.hullHealth = 8; // 20%
updateNpcCombat(boatShip, 1, 1/60, [boatShip, playerShip]);
assert.strictEqual(boatShip.data.isDisabled, true, 'Boat at 8 armor MUST be disabled');

// Delta (10 armor): disabled at <= 2
deltaShip.data.hullHealth = 2.5; // 25% > 20%
updateNpcCombat(deltaShip, 1, 1/60, [deltaShip, playerShip]);
assert.strictEqual(deltaShip.data.isDisabled, false, 'Delta at 2.5 armor must NOT be disabled');

deltaShip.data.hullHealth = 2.0; // 20%
updateNpcCombat(deltaShip, 1, 1/60, [deltaShip, playerShip]);
assert.strictEqual(deltaShip.data.isDisabled, true, 'Delta at 2.0 armor MUST be disabled');

console.log('✓ Disabling thresholds (20% of maxArmor) correctly applied across Hammer (20), Boat (8), and standard (2)');

console.log('\nALL HULL ARMOR TESTS PASSED!');
