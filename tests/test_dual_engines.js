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
  visible: false,
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
    getEngineMounts,
    updateShipEngineVisuals,
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    ACCEL_LIMIT,
    TURN_RATE,
  };
`);

const exported = runCode();
const {
  setup,
  buildShip,
  getEngineMounts,
  updateShipEngineVisuals,
  HULLS_DATA,
  ENGINES_DATA,
  FACTION_PAINTS,
  ACCEL_LIMIT,
  TURN_RATE,
} = exported;

setup();

const playerShip = global.window.playerShip;
const stdEngine = ENGINES_DATA.find((e) => e.name === 'thruster');
const turboEngine = ENGINES_DATA.find((e) => e.name === 'turbo_thruster');
const bluePaint = FACTION_PAINTS.find((p) => p.name.includes('Aegis') || p.name === 'Blue') || FACTION_PAINTS[0];

console.log('--- 1. Testing Engine Mount Coordinates ---');
const shadowHull = HULLS_DATA.find((h) => h.name === 'Shadow');
const boatHull = HULLS_DATA.find((h) => h.name === 'Boat');

assert(shadowHull, 'Shadow hull must exist in HULLS_DATA');
assert(Array.isArray(shadowHull.engine_mounts), 'Shadow must have engine_mounts array');
assert.strictEqual(shadowHull.engine_mounts.length, 2, 'Shadow must have exactly two engine mounts');
assert.deepStrictEqual(shadowHull.engine_mounts[0], { x: 13, y: 27 }, 'Shadow engine mount 1 must be at (13, 27)');
assert.deepStrictEqual(shadowHull.engine_mounts[1], { x: 18, y: 27 }, 'Shadow engine mount 2 must be at (18, 27)');
console.log('✓ Shadow engine mounts verified at (13, 27) and (18, 27)');

assert(boatHull, 'Boat hull must exist in HULLS_DATA');
assert(Array.isArray(boatHull.engine_mounts), 'Boat must have engine_mounts array');
assert.strictEqual(boatHull.engine_mounts.length, 2, 'Boat must have exactly two engine mounts');
assert.deepStrictEqual(boatHull.engine_mounts[0], { x: 10, y: 25 }, 'Boat engine mount 1 must be at (10, 25)');
assert.deepStrictEqual(boatHull.engine_mounts[1], { x: 23, y: 25 }, 'Boat engine mount 2 must be at (23, 25)');
console.log('✓ Boat engine mounts verified at (10, 25) and (23, 25)');

// Verify single-engine hulls
const singleEngineHulls = HULLS_DATA.filter((h) => h.name !== 'Shadow' && h.name !== 'Boat');
for (const hull of singleEngineHulls) {
  const mounts = getEngineMounts(hull);
  assert.strictEqual(mounts.length, 1, `${hull.name} must have 1 engine mount`);
}
console.log('✓ All other hulls have exactly 1 engine mount');

console.log('\n--- 2. Testing Dual Engine Mass and Thrust Scaling ---');
// Shadow with standard thruster: 2 * 1500kg engine mass, 2 * 50kN thrust
const shadowShip = buildShip(shadowHull, stdEngine, bluePaint);
const expectedShadowMass = shadowHull.mass + (2 * stdEngine.mass); // 2767 + 3000 = 5767 kg
const expectedShadowThrust = 2 * stdEngine.thrust; // 100 kN
const expectedShadowAccel = (expectedShadowThrust * 1000) / expectedShadowMass; // 17.340038 m/s²
const expectedShadowMaxSpeed = expectedShadowAccel * ACCEL_LIMIT;

assert.strictEqual(expectedShadowMass, 5767, 'Shadow + 2 standard engines mass must be 5,767 kg');
assert.strictEqual(expectedShadowThrust, 100, 'Shadow + 2 standard engines thrust must be 100 kN');
assert(Math.abs(shadowShip.data.accel - expectedShadowAccel) < 1e-6, `Shadow accel mismatch: ${shadowShip.data.accel} vs ${expectedShadowAccel}`);
assert(Math.abs(shadowShip.data.maxSpeed - expectedShadowMaxSpeed) < 1e-6, `Shadow maxSpeed mismatch`);
assert.strictEqual(shadowShip.data.engineLitSprites.length, 2, 'Shadow must create 2 engine lit sprites');
assert.strictEqual(shadowShip.data.engineReverseSprites.length, 2, 'Shadow with reversible engine must create 2 reverse sprites');
console.log(`✓ Shadow (standard thruster): mass = ${expectedShadowMass} kg, thrust = ${expectedShadowThrust} kN, accel = ${expectedShadowAccel.toFixed(2)} m/s²`);

// Boat with standard thruster: 2 * 1500kg engine mass, 2 * 50kN thrust
const boatShip = buildShip(boatHull, stdEngine, bluePaint);
const expectedBoatMass = boatHull.mass + (2 * stdEngine.mass); // 8977 + 3000 = 11977 kg
const expectedBoatThrust = 2 * stdEngine.thrust; // 100 kN
const expectedBoatAccel = (expectedBoatThrust * 1000) / expectedBoatMass; // 8.349336 m/s²
const expectedBoatMaxSpeed = expectedBoatAccel * ACCEL_LIMIT;

assert.strictEqual(expectedBoatMass, 11977, 'Boat + 2 standard engines mass must be 11,977 kg');
assert.strictEqual(expectedBoatThrust, 100, 'Boat + 2 standard engines thrust must be 100 kN');
assert(Math.abs(boatShip.data.accel - expectedBoatAccel) < 1e-6, `Boat accel mismatch: ${boatShip.data.accel} vs ${expectedBoatAccel}`);
assert(Math.abs(boatShip.data.maxSpeed - expectedBoatMaxSpeed) < 1e-6, `Boat maxSpeed mismatch`);
assert.strictEqual(boatShip.data.engineLitSprites.length, 2, 'Boat must create 2 engine lit sprites');
assert.strictEqual(boatShip.data.engineReverseSprites.length, 2, 'Boat with reversible engine must create 2 reverse sprites');
console.log(`✓ Boat (standard thruster): mass = ${expectedBoatMass} kg, thrust = ${expectedBoatThrust} kN, accel = ${expectedBoatAccel.toFixed(2)} m/s²`);

// Shadow with turbo thruster: 2 * 1500kg engine mass, 2 * 100kN thrust
const shadowTurboShip = buildShip(shadowHull, turboEngine, bluePaint);
const expectedShadowTurboThrust = 2 * turboEngine.thrust; // 200 kN
const expectedShadowTurboAccel = (expectedShadowTurboThrust * 1000) / expectedShadowMass; // 34.680076 m/s²

assert.strictEqual(expectedShadowTurboThrust, 200, 'Shadow + 2 turbo engines thrust must be 200 kN');
assert(Math.abs(shadowTurboShip.data.accel - expectedShadowTurboAccel) < 1e-6, `Shadow turbo accel mismatch`);
console.log(`✓ Shadow (turbo thruster): mass = ${expectedShadowMass} kg, thrust = ${expectedShadowTurboThrust} kN, accel = ${expectedShadowTurboAccel.toFixed(2)} m/s²`);

// Status panel UI synchronization
const bodySelect = elements['body-select'];
const engineSelect = elements['engine-select'];

engineSelect.value = 'thruster';
engineSelect.dispatch('change');
assert.strictEqual(playerShip.data.engine.name, 'thruster');

bodySelect.value = 'Shadow';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Shadow');
assert.strictEqual(elements['status-mass-val'].textContent, `${expectedShadowMass.toLocaleString()} kg`);
assert(Math.abs(playerShip.data.accel - expectedShadowAccel) < 1e-6, 'Player ship accel must match dual-engine Shadow accel');
console.log(`✓ Customizing player to Shadow updates UI mass to "${elements['status-mass-val'].textContent}" and accel to ${playerShip.data.accel.toFixed(2)}`);

bodySelect.value = 'Boat';
bodySelect.dispatch('change');
assert.strictEqual(playerShip.data.hull.name, 'Boat');
assert.strictEqual(elements['status-mass-val'].textContent, `${expectedBoatMass.toLocaleString()} kg`);
assert(Math.abs(playerShip.data.accel - expectedBoatAccel) < 1e-6, 'Player ship accel must match dual-engine Boat accel');
console.log(`✓ Customizing player to Boat updates UI mass to "${elements['status-mass-val'].textContent}" and accel to ${playerShip.data.accel.toFixed(2)}`);

console.log('\n--- 3. Testing Turning Visuals (Differential Thruster Firing) ---');

// Test Shadow hull turning
const testShadow = buildShip(shadowHull, stdEngine, bluePaint);
// Sprites: index 0 is at x:13 (left, since 13 < 15.5 pivot.x), index 1 is at x:18 (right, since 18 > 15.5 pivot.x)
const shadowLeftSprite = testShadow.data.engineLitSprites[0];
const shadowRightSprite = testShadow.data.engineLitSprites[1];

// 3a. Thrusting forward with no turn: both engines show firing graphic
testShadow.data.engineLitSprite.visible = true;
testShadow.data.turnDirection = null;
const shadowLeftLit = testShadow.data.engineLitSprites[0];
const shadowRightLit = testShadow.data.engineLitSprites[1];
const shadowLeftRev = testShadow.data.engineReverseSprites[0];
const shadowRightRev = testShadow.data.engineReverseSprites[1];

assert.strictEqual(shadowLeftLit.visible, true, 'Left engine must show firing graphic when thrusting straight');
assert.strictEqual(shadowRightLit.visible, true, 'Right engine must show firing graphic when thrusting straight');
assert.strictEqual(shadowLeftRev.visible, false, 'Left reverse must be off when thrusting forward');
assert.strictEqual(shadowRightRev.visible, false, 'Right reverse must be off when thrusting forward');
assert.strictEqual(testShadow.data.engineLitSprite.visible, true, 'Overall thruster state is active');
console.log('✓ Forward thrust straight: both engines fire forward (leftLit=true, rightLit=true, rev=false)');

// 3b. Turning LEFT while thrusting:
// "If the ship is turning and thrusting, it should not show the engine it's turning toward reversing, just not firing."
// Left engine (turning toward): not firing forward (false), not reversing (false)
// Right engine (turning away): firing forward (true), not reversing (false)
testShadow.data.turnDirection = 'left';
assert.strictEqual(shadowLeftLit.visible, false, 'Left engine must NOT fire forward when turning left while thrusting');
assert.strictEqual(shadowLeftRev.visible, false, 'Left engine must NOT reverse when turning left while thrusting');
assert.strictEqual(shadowRightLit.visible, true, 'Right engine MUST fire forward when turning left while thrusting');
assert.strictEqual(shadowRightRev.visible, false, 'Right engine must NOT reverse when turning left while thrusting');
assert.strictEqual(testShadow.data.engineLitSprite.visible, true, 'Overall thruster state remains active');
console.log('✓ Turning left while thrusting: left engine not firing and not reversing, right engine firing');

// 3c. Turning RIGHT while thrusting:
// Right engine (turning toward): not firing forward (false), not reversing (false)
// Left engine (turning away): firing forward (true), not reversing (false)
testShadow.data.turnDirection = 'right';
assert.strictEqual(shadowLeftLit.visible, true, 'Left engine MUST fire forward when turning right while thrusting');
assert.strictEqual(shadowLeftRev.visible, false, 'Left engine must NOT reverse when turning right while thrusting');
assert.strictEqual(shadowRightLit.visible, false, 'Right engine must NOT fire forward when turning right while thrusting');
assert.strictEqual(shadowRightRev.visible, false, 'Right engine must NOT reverse when turning right while thrusting');
assert.strictEqual(testShadow.data.engineLitSprite.visible, true, 'Overall thruster state remains active');
console.log('✓ Turning right while thrusting: right engine not firing and not reversing, left engine firing');

// 3d. Straightening out while thrusting: both engines fire again
testShadow.data.turnDirection = null;
assert.strictEqual(shadowLeftLit.visible, true, 'Left engine resumes firing when straight');
assert.strictEqual(shadowRightLit.visible, true, 'Right engine resumes firing when straight');
assert.strictEqual(shadowLeftRev.visible, false, 'Left reverse remains off');
assert.strictEqual(shadowRightRev.visible, false, 'Right reverse remains off');
console.log('✓ Straightening out restores both firing graphics (left=true, right=true)');

// 3e. Turning LEFT but NOT thrusting:
// "if a ship with two engines is turning but not thrusting, it shows the engine on the side it's turning away from burning and the engine on the side it's turning toward reverses if applicable."
// Turning away from: RIGHT -> Right engine burns forward (rightLit=true, rightRev=false)
// Turning toward: LEFT -> Left engine reverses if applicable (leftLit=false, leftRev=true)
testShadow.data.engineLitSprite.visible = false;
testShadow.data.turnDirection = 'left';
assert.strictEqual(shadowRightLit.visible, true, 'Right engine (side turning away from) must burn forward when turning left without thrust');
assert.strictEqual(shadowRightRev.visible, false, 'Right reverse must be off when turning left');
assert.strictEqual(shadowLeftLit.visible, false, 'Left engine must not fire forward when turning left without thrust');
assert.strictEqual(shadowLeftRev.visible, true, 'Left engine (side turning toward) must reverse when turning left without thrust');
console.log('✓ Turning left without thrust: right burns forward, left reverses (rightLit=true, leftRev=true)');

// 3f. Turning RIGHT but NOT thrusting:
// Turning away from: LEFT -> Left engine burns forward (leftLit=true, leftRev=false)
// Turning toward: RIGHT -> Right engine reverses if applicable (rightLit=false, rightRev=true)
testShadow.data.turnDirection = 'right';
assert.strictEqual(shadowLeftLit.visible, true, 'Left engine (side turning away from) must burn forward when turning right without thrust');
assert.strictEqual(shadowLeftRev.visible, false, 'Left reverse must be off when turning right');
assert.strictEqual(shadowRightLit.visible, false, 'Right engine must not fire forward when turning right without thrust');
assert.strictEqual(shadowRightRev.visible, true, 'Right engine (side turning toward) must reverse when turning right without thrust');
console.log('✓ Turning right without thrust: left burns forward, right reverses (leftLit=true, rightRev=true)');

// 3g. Neither turning nor thrusting: all thrusters off
testShadow.data.turnDirection = null;
assert.strictEqual(shadowLeftLit.visible, false, 'Left forward must be off when coasting');
assert.strictEqual(shadowLeftRev.visible, false, 'Left reverse must be off when coasting');
assert.strictEqual(shadowRightLit.visible, false, 'Right forward must be off when coasting');
assert.strictEqual(shadowRightRev.visible, false, 'Right reverse must be off when coasting');
console.log('✓ Neither turning nor thrusting: all thrusters off (leftLit=false, rightLit=false, rev=false)');

// 3h. Non-reversible engine turning but not thrusting (turbo_thruster on Shadow):
// "reverses if applicable" -> since turbo thruster cannot reverse, no reverse flame is shown
const shadowTurboTest = buildShip(shadowHull, turboEngine, bluePaint);
shadowTurboTest.data.engineLitSprite.visible = false;
shadowTurboTest.data.turnDirection = 'left';
assert.strictEqual(shadowTurboTest.data.engineLitSprites[1].visible, true, 'Right engine burns forward on turbo thruster');
assert.strictEqual(shadowTurboTest.data.engineLitSprites[0].visible, false, 'Left engine not firing forward');
assert.strictEqual(shadowTurboTest.data.engineReverseSprites.length, 0, 'Turbo thruster has no reverse sprites (reversible: false)');
console.log('✓ Non-reversible turbo thruster burns outside engine but does not reverse inside engine');

console.log('\n--- 4. Testing Boat Hull Turning Visuals ---');
const testBoat = buildShip(boatHull, stdEngine, bluePaint);
// Sprites: index 0 is at x:10 (left, 10 < 17.5), index 1 is at x:23 (right, 23 > 17.5)
const boatLeftLit = testBoat.data.engineLitSprites[0];
const boatRightLit = testBoat.data.engineLitSprites[1];
const boatLeftRev = testBoat.data.engineReverseSprites[0];
const boatRightRev = testBoat.data.engineReverseSprites[1];

// 4a. Turning left while thrusting
testBoat.data.engineLitSprite.visible = true;
testBoat.data.turnDirection = 'left';
assert.strictEqual(boatLeftLit.visible, false, 'Boat left engine must be off when turning left');
assert.strictEqual(boatLeftRev.visible, false, 'Boat left engine must not reverse when turning left while thrusting');
assert.strictEqual(boatRightLit.visible, true, 'Boat right engine must be on when turning left');
assert.strictEqual(boatRightRev.visible, false, 'Boat right engine must not reverse when turning left while thrusting');

// 4b. Turning right while thrusting
testBoat.data.turnDirection = 'right';
assert.strictEqual(boatLeftLit.visible, true, 'Boat left engine must be on when turning right');
assert.strictEqual(boatLeftRev.visible, false, 'Boat left engine must not reverse when turning right while thrusting');
assert.strictEqual(boatRightLit.visible, false, 'Boat right engine must be off when turning right');
assert.strictEqual(boatRightRev.visible, false, 'Boat right engine must not reverse when turning right while thrusting');

// 4c. Turning left without thrust
testBoat.data.engineLitSprite.visible = false;
testBoat.data.turnDirection = 'left';
assert.strictEqual(boatLeftLit.visible, false, 'Boat left engine must not fire forward when turning left without thrust');
assert.strictEqual(boatLeftRev.visible, true, 'Boat left engine must reverse when turning left without thrust');
assert.strictEqual(boatRightLit.visible, true, 'Boat right engine must burn forward when turning left without thrust');
assert.strictEqual(boatRightRev.visible, false, 'Boat right reverse must be off when turning left without thrust');

// 4d. Straightening out without thrust
testBoat.data.turnDirection = null;
assert.strictEqual(boatLeftLit.visible, false, 'Boat left forward off when straight without thrust');
assert.strictEqual(boatLeftRev.visible, false, 'Boat left reverse off when straight without thrust');
assert.strictEqual(boatRightLit.visible, false, 'Boat right forward off when straight without thrust');
assert.strictEqual(boatRightRev.visible, false, 'Boat right reverse off when straight without thrust');
console.log('✓ Boat hull correctly applies differential thruster visuals during left/right turns');

console.log('\n--- 5. Testing Single Engine Hulls Do Not Suppress Flame ---');
const deltaHull = HULLS_DATA.find((h) => h.name === 'Delta');
const testDelta = buildShip(deltaHull, stdEngine, bluePaint);
testDelta.data.engineLitSprite.visible = true;

testDelta.data.turnDirection = 'left';
assert.strictEqual(testDelta.data.engineLitSprites[0].visible, true, 'Single engine hull must keep engine lit when turning left');
testDelta.data.turnDirection = 'right';
assert.strictEqual(testDelta.data.engineLitSprites[0].visible, true, 'Single engine hull must keep engine lit when turning right');
console.log('✓ Single engine ship keeps engine lit while turning (flame not suppressed)');

console.log('\n--- 6. Testing Disabled Ship Engine Visuals ---');
testShadow.data.isDisabled = true;
testShadow.data.turnDirection = 'right';
testShadow.data.engineLitSprite.visible = true;
assert.strictEqual(shadowLeftSprite.visible, false, 'Disabled ship must have left engine off');
assert.strictEqual(shadowRightSprite.visible, false, 'Disabled ship must have right engine off');
console.log('✓ Disabled ship turns off all engines regardless of turn or thrust');

console.log('\nAll dual engine tests passed successfully! 🚀🚀');
