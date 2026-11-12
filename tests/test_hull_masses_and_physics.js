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
  createElement: (tag) => mockElement(),
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
      Object.assign(this, mockPixiObject());
      this.children = [];
    }
    addChild(c) { this.children.push(c); }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
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
    buildShip,
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    ACCEL_LIMIT,
    TURN_RATE,
  };
`);

const exported = runCode();
const { setup, buildShip, HULLS_DATA, ENGINES_DATA, FACTION_PAINTS, ACCEL_LIMIT, TURN_RATE } = exported;

setup();

console.log('--- 1. Testing HULLS_DATA Mass Definitions ---');
const expectedMasses = {
  'Anvil': 15000,
  'Avocado': 20000,
  'Boat': 25000,
  'Crab': 20000,
  'Delta': 7000,
  'Hammer': 22000,
  'Protogon': 20000,
  'Shadow': 27000,
  'Shuttle': 15000,
  'Skate': 18000,
};

assert.strictEqual(HULLS_DATA.length, 10, 'Expected 10 ship hulls in HULLS_DATA');

for (const [name, expectedMass] of Object.entries(expectedMasses)) {
  const hull = HULLS_DATA.find((h) => h.name === name);
  assert(hull, `Hull "${name}" must exist in HULLS_DATA`);
  assert.strictEqual(
    hull.mass,
    expectedMass,
    `Hull "${name}" mass must be ${expectedMass} kg, found ${hull.mass} kg`
  );
  console.log(`✓ ${name.padEnd(10)}: mass = ${hull.mass.toLocaleString()} kg`);
}

console.log('\n--- 2. Testing Acceleration & Top Speed Differentiation ---');
const stdEngine = ENGINES_DATA.find((e) => e.name === 'thruster');
const turboEngine = ENGINES_DATA.find((e) => e.name === 'turbo_thruster');
const bluePaint = FACTION_PAINTS[0];

assert(stdEngine, 'Standard thruster must exist in ENGINES_DATA');
assert(turboEngine, 'Turbo thruster must exist in ENGINES_DATA');

const timeToTurnAround = Math.PI / (TURN_RATE * 60);

for (const hull of HULLS_DATA) {
  // Test with standard thruster
  const stdShip = buildShip(hull, stdEngine, bluePaint);
  const totalMassStd = hull.mass + stdEngine.mass;
  const expectedAccelStd = (stdEngine.thrust * 1000) / totalMassStd;
  const expectedMaxSpeedStd = expectedAccelStd * ACCEL_LIMIT;
  const expectedDistToStopStd = (expectedMaxSpeedStd * expectedMaxSpeedStd) / (2 * expectedAccelStd);
  const expectedStoppingDistStd = (expectedMaxSpeedStd * timeToTurnAround) + expectedDistToStopStd;

  assert(
    Math.abs(stdShip.data.accel - expectedAccelStd) < 1e-6,
    `${hull.name} standard accel mismatch: expected ${expectedAccelStd}, got ${stdShip.data.accel}`
  );
  assert(
    Math.abs(stdShip.data.maxSpeed - expectedMaxSpeedStd) < 1e-6,
    `${hull.name} standard maxSpeed mismatch: expected ${expectedMaxSpeedStd}, got ${stdShip.data.maxSpeed}`
  );
  assert(
    Math.abs(stdShip.data.stoppingDistance - expectedStoppingDistStd) < 1e-6,
    `${hull.name} standard stoppingDistance mismatch`
  );

  // Test with turbo thruster
  const turboShip = buildShip(hull, turboEngine, bluePaint);
  const totalMassTurbo = hull.mass + turboEngine.mass;
  const expectedAccelTurbo = (turboEngine.thrust * 1000) / totalMassTurbo;
  const expectedMaxSpeedTurbo = expectedAccelTurbo * ACCEL_LIMIT;

  assert(
    Math.abs(turboShip.data.accel - expectedAccelTurbo) < 1e-6,
    `${hull.name} turbo accel mismatch`
  );
  assert(
    Math.abs(turboShip.data.maxSpeed - expectedMaxSpeedTurbo) < 1e-6,
    `${hull.name} turbo maxSpeed mismatch`
  );

  console.log(
    `✓ ${hull.name.padEnd(10)} | Total Mass: ${(totalMassStd + ' kg').padEnd(9)} | Std Accel: ${expectedAccelStd.toFixed(2).padStart(5)} m/s² (Top: ${expectedMaxSpeedStd.toFixed(1).padStart(5)} px/s) | Turbo Accel: ${expectedAccelTurbo.toFixed(2).padStart(5)} m/s² (Top: ${expectedMaxSpeedTurbo.toFixed(1).padStart(5)} px/s)`
  );
}

console.log('\n--- 3. Testing Comparative Acceleration & Speed Rankings ---');
const deltaHull = HULLS_DATA.find((h) => h.name === 'Delta');
const shadowHull = HULLS_DATA.find((h) => h.name === 'Shadow');
const anvilHull = HULLS_DATA.find((h) => h.name === 'Anvil');
const shuttleHull = HULLS_DATA.find((h) => h.name === 'Shuttle');

const deltaShip = buildShip(deltaHull, stdEngine, bluePaint);
const shadowShip = buildShip(shadowHull, stdEngine, bluePaint);
const anvilShip = buildShip(anvilHull, stdEngine, bluePaint);
const shuttleShip = buildShip(shuttleHull, stdEngine, bluePaint);

// Delta should be fastest / highest acceleration
assert(
  deltaShip.data.accel > anvilShip.data.accel,
  'Delta must have higher acceleration than Anvil'
);
assert(
  deltaShip.data.maxSpeed > shadowShip.data.maxSpeed,
  'Delta must have higher top speed than Shadow'
);

// Shadow should be slowest / lowest acceleration
assert(
  shadowShip.data.accel < anvilShip.data.accel,
  'Shadow must have lower acceleration than Anvil'
);

// Anvil and Shuttle have the same hull mass (15,000 kg)
assert.strictEqual(
  anvilShip.data.accel,
  shuttleShip.data.accel,
  'Anvil and Shuttle have the same mass and must have identical acceleration'
);

console.log(`✓ Delta (lightest at 7,000kg) top speed: ${deltaShip.data.maxSpeed.toFixed(2)} px/s`);
console.log(`✓ Shadow (heaviest at 27,000kg) top speed: ${shadowShip.data.maxSpeed.toFixed(2)} px/s`);
console.log(`✓ Delta is ${(deltaShip.data.accel / shadowShip.data.accel).toFixed(2)}x more agile than Shadow`);
console.log('✓ Acceleration and top speed rankings are correct');

console.log('\n--- 4. Testing Player Customization Recalculations ---');
const playerShip = global.window.playerShip;
const bodySelect = elements['body-select'];

assert(bodySelect, 'body-select element must exist');

// Switch player to Delta
bodySelect.value = 'Delta';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Delta');

const expectedDeltaAccel = (playerShip.data.engine.thrust * 1000) / (deltaHull.mass + playerShip.data.engine.mass);
const expectedDeltaMaxSpeed = expectedDeltaAccel * ACCEL_LIMIT;

assert(
  Math.abs(playerShip.data.accel - expectedDeltaAccel) < 1e-6,
  'Player ship accel must update to Delta accel'
);
assert(
  Math.abs(playerShip.data.maxSpeed - expectedDeltaMaxSpeed) < 1e-6,
  'Player ship maxSpeed must update to Delta maxSpeed'
);
const expectedDeltaTotalMass = (deltaHull.mass + playerShip.data.engine.mass).toLocaleString() + ' kg';
assert.strictEqual(elements['status-mass-val'].textContent, expectedDeltaTotalMass);
console.log(`✓ Switching player to Delta updates accel to ${playerShip.data.accel.toFixed(2)} and status panel to ${expectedDeltaTotalMass}`);

// Switch player to Shadow
bodySelect.value = 'Shadow';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Shadow');

const expectedShadowAccel = (playerShip.data.engine.thrust * 1000) / (shadowHull.mass + playerShip.data.engine.mass);
const expectedShadowMaxSpeed = expectedShadowAccel * ACCEL_LIMIT;

assert(
  Math.abs(playerShip.data.accel - expectedShadowAccel) < 1e-6,
  'Player ship accel must update to Shadow accel'
);
assert(
  Math.abs(playerShip.data.maxSpeed - expectedShadowMaxSpeed) < 1e-6,
  'Player ship maxSpeed must update to Shadow maxSpeed'
);
const expectedShadowTotalMass = (shadowHull.mass + playerShip.data.engine.mass).toLocaleString() + ' kg';
assert.strictEqual(elements['status-mass-val'].textContent, expectedShadowTotalMass);
console.log(`✓ Switching player to Shadow updates accel to ${playerShip.data.accel.toFixed(2)} and status panel to ${expectedShadowTotalMass}`);

console.log('\nAll hull mass and physics tests passed successfully!');
