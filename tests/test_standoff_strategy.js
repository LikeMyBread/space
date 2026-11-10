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
const { setup, buildShip, ENGINES_DATA } = exported;

setup();
const updateNpcCombat = global.window.updateNpcCombat;
const getStrategyDisplayName = global.window.getStrategyDisplayName;
const getRandomCombatStrategy = global.window.getRandomCombatStrategy;

console.log('--- 1. Testing getStrategyDisplayName for STANDOFF ---');
assert.strictEqual(getStrategyDisplayName('standoff'), 'STANDOFF');
assert.strictEqual(getStrategyDisplayName('STANDOFF'), 'STANDOFF');
assert.strictEqual(getStrategyDisplayName('stand_off'), 'STANDOFF');
assert.strictEqual(getStrategyDisplayName('turn_fight'), 'TURN FIGHT');
assert.strictEqual(getStrategyDisplayName('joust'), 'JOUSTING');
console.log('✓ getStrategyDisplayName correctly returns STANDOFF');

console.log('--- 2. Testing getRandomCombatStrategy ---');
assert(typeof getRandomCombatStrategy === 'function', 'getRandomCombatStrategy should be defined');
const counts = { turn_fight: 0, joust: 0, standoff: 0 };
const TRIALS = 1500;
for (let i = 0; i < TRIALS; i++) {
  const strat = getRandomCombatStrategy();
  assert(strat in counts, `Unexpected strategy: ${strat}`);
  counts[strat]++;
}
console.log(`Distribution across ${TRIALS} trials:`, counts);
// Each should have roughly 1/3 (between 25% and 42%)
assert(counts.turn_fight > TRIALS * 0.25 && counts.turn_fight < TRIALS * 0.42, 'turn_fight frequency out of expected 33% bounds');
assert(counts.joust > TRIALS * 0.25 && counts.joust < TRIALS * 0.42, 'joust frequency out of expected 33% bounds');
assert(counts.standoff > TRIALS * 0.25 && counts.standoff < TRIALS * 0.42, 'standoff frequency out of expected 33% bounds');
console.log('✓ getRandomCombatStrategy uniformly distributes among turn_fight, joust, and standoff');

console.log('--- 3. Testing Standoff: Immediate Aim and Shoot ---');
// Build attacker (standoff) with reversible engine and target
const revEngine = ENGINES_DATA.find(e => e.reversible);
const attacker = buildShip(null, revEngine);
attacker.data.combatStrategy = 'standoff';
attacker.sprite.position.set(500, 500);
attacker.data.vx = 0;
attacker.data.vy = 0;
attacker.data.paint = { name: 'red', hex: '#ef4444' };

const target = buildShip();
target.sprite.position.set(500, 430); // 70px north (dist = 70, weaponRange = 87.5)
target.data.vx = 0;
target.data.vy = 0;
target.data.paint = { name: 'blue', hex: '#3b82f6' };

// Set attacker rotation facing north (towards target)
attacker.sprite.rotation = 0; // In this engine, 0 = north (-y)
attacker.data.combatTarget = target;

const origWeapons = attacker.data.weapons;
attacker.data.weapons = [{
  weapon: origWeapons[0].weapon,
  hardpoint: origWeapons[0].hardpoint,
  lastFired: -Infinity,
}];

const origLastFired = attacker.data.weapons[0].lastFired;
updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert(attacker.data.weapons[0].lastFired > origLastFired, 'Standoff ship should fire immediately when in range');
console.log('✓ Standoff ship immediately turns and shoots at target');

console.log('--- 3b. Testing Standoff Strategy Firing at 1.5x Max Weapon Range ---');
// Max weapon range is 87.5px. 1.5x max weapon range is 131.25px.
// Place target at 120px (beyond 1.0x range, but within 1.5x range)
target.sprite.position.set(500, 380); // 120px north
attacker.sprite.rotation = 0;
attacker.data.weapons[0].lastFired = -Infinity;
attacker.data.weaponGroups = null;
const firedBefore120 = attacker.data.weapons[0].lastFired;
updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert(attacker.data.weapons[0].lastFired > firedBefore120, 'Standoff ship must begin firing at 120px (within 1.5x max weapon range of 131.25px)');

// Place target at 145px (beyond 1.5x range)
target.sprite.position.set(500, 355); // 145px north
attacker.data.weapons[0].lastFired = -Infinity;
attacker.data.weaponGroups = null;
const firedBefore145 = attacker.data.weapons[0].lastFired;
updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert.strictEqual(attacker.data.weapons[0].lastFired, firedBefore145, 'Standoff ship must NOT fire at 145px (beyond 1.5x max weapon range)');

// Verify that a non-standoff ship (e.g. jousting) at 120px does NOT fire (since 120px > 1.0x max weapon range)
const jouster = buildShip();
jouster.data.combatStrategy = 'joust';
jouster.data.combatTarget = target;
jouster.sprite.position.set(500, 500);
target.sprite.position.set(500, 380); // 120px away
const joustLead = global.window.getLeadSolution(jouster, target);
assert.strictEqual(joustLead.inRange, false, 'Non-standoff ship at 120px must not consider target in range');
console.log('✓ Standoff strategy fires at 1.5x max weapon range (120px in range, 145px out of range, non-standoff excluded)');

console.log('--- 4. Testing Range Management: Forward Thrust when Drifting Beyond Max Range ---');
// Weapon range is 87.5px. targetMaxRange is 87.5 * 0.92 = 80.5px.
// Move target to 120px away (beyond max range)
target.sprite.position.set(500, 380); // dist = 120px
attacker.data.vx = 0;
attacker.data.vy = 0;
attacker.sprite.rotation = 0; // facing north towards target

updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert(attacker.data.engineLitSprite.visible === true, 'Engine should ignite forward thrust when drifting beyond max range');
assert(attacker.data.engineReverseSprite ? attacker.data.engineReverseSprite.visible === false : true, 'Reverse sprite must be false');
assert(attacker.data.vy < 0, `Ship should gain velocity towards target (-y direction), got vy = ${attacker.data.vy}`);
console.log(`✓ Forward thrust engaged to recover range (vy = ${attacker.data.vy.toFixed(2)}, engineLit = true)`);

console.log('--- 5. Testing Range Management: Reversible Thrusters When Inside Min Range ---');
// targetMinRange is 87.5 * 0.72 = 63.0px.
// Place target at 50px away (too close).
attacker.data.engine.reversible = true;
attacker.data.vx = 0;
attacker.data.vy = 0;
attacker.sprite.rotation = 0; // facing north towards target
target.sprite.position.set(500, 450); // dist = 50px

updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert(attacker.data.engineReverseSprite.visible === true, 'Reversible thruster should ignite reverse flame when inside min range');
assert(attacker.data.engineLitSprite.visible === false, 'Forward flame should be off');
assert(attacker.data.vy > 0, `Ship should gain reverse velocity (+y direction away from target), got vy = ${attacker.data.vy}`);
console.log(`✓ Reverse thruster backed off from target (vy = ${attacker.data.vy.toFixed(2)}, engineReverse = true)`);

console.log('--- 6. Testing Range Management: Non-Reversible Thrusters Inside Min Range ---');
const nonRevEngine = ENGINES_DATA.find(e => !e.reversible);
const nonRevAttacker = buildShip(null, nonRevEngine);
nonRevAttacker.data.combatStrategy = 'standoff';
nonRevAttacker.data.combatTarget = target;
nonRevAttacker.data.paint = { name: 'red', hex: '#ef4444' };
nonRevAttacker.sprite.position.set(500, 500);
nonRevAttacker.sprite.rotation = 0;
nonRevAttacker.data.vx = 0;
nonRevAttacker.data.vy = 0;
target.sprite.position.set(500, 450); // dist = 50px (< 63px)

updateNpcCombat(nonRevAttacker, 1, 1/60, [nonRevAttacker, target]);
assert(nonRevAttacker.data.engineLitSprite.visible === false, 'Forward engine must not fire when inside min range');
if (nonRevAttacker.data.engineReverseSprite) {
  assert(nonRevAttacker.data.engineReverseSprite.visible === false, 'Reverse engine must not fire for non-reversible ship');
}
console.log('✓ Non-reversible ship coasts without forward thrust when inside standoff envelope');

console.log('--- 7. Testing Sweet Spot & Lateral Drift Preservation ---');
// Place ship at dist = 70px (inside sweet spot [63, 80.5]).
attacker.sprite.position.set(500, 500);
attacker.sprite.rotation = 0;
attacker.data.vx = 25;
attacker.data.vy = 0;
target.sprite.position.set(500, 430); // dist = 70px

updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert(attacker.data.engineLitSprite.visible === false, 'Forward engine should be off in sweet spot');
assert(attacker.data.engineReverseSprite.visible === false, 'Reverse engine should be off in sweet spot');
assert.strictEqual(attacker.data.vx, 25, 'Lateral drift velocity vx should be fully preserved');
console.log('✓ Sweet spot maintained: engines idle, lateral drift preserved at vx = 25 px/s');

console.log('--- 8. Testing Shield Retreat Option for Standoff Strategy ---');
attacker.data.shield = 1; // < 25% of 10
attacker.data.isRetreating = false;
updateNpcCombat(attacker, 1, 1/60, [attacker, target]);
assert.strictEqual(attacker.data.isRetreating, true, 'Ship should enter retreating state when shield < 25%');
assert.strictEqual(attacker.data.aiState, 'RETREAT', 'AI state should be RETREAT');

const displayedState = getStrategyDisplayName(attacker.data.combatStrategy);
assert.strictEqual(displayedState, 'STANDOFF', 'Target tracker should display STANDOFF');
console.log('✓ Shield retreat triggers correctly and strategy display reports STANDOFF');

console.log('--- 9. Testing Standoff Range Calculation when Chasing at Near Max Speed ---');
// Attacker moving north at near max speed (vy = -50 px/s, facing north)
// Base weapon range is 87.5px (speed 100 * lifetime 0.875).
// When chasing at 50 px/s forward velocity, projectile inherits ship velocity:
// Effective weapon speed is 100 + 50 = 150 px/s.
// Effective weapon range is 150 * 0.875 = 131.25px!
// targetMaxRange is 131.25 * 0.92 = 120.75px.
// targetMinRange is 131.25 * 0.72 = 94.5px.
const chasingAttacker = buildShip(null, revEngine);
chasingAttacker.data.combatStrategy = 'standoff';
chasingAttacker.data.paint = { name: 'red', hex: '#ef4444' };
chasingAttacker.sprite.position.set(500, 500);
chasingAttacker.sprite.rotation = 0; // North
chasingAttacker.data.vx = 0;
chasingAttacker.data.vy = -50; // Chasing north at 50 px/s

// Place target at 110px ahead (500, 390).
// Under old static range (80.5px), attacker would underestimate range and continue thrusting forward.
// With forward velocity accounted for, 110px is inside the sweet spot [94.5px, 120.75px]!
const chaseTarget = buildShip();
chaseTarget.data.paint = { name: 'blue', hex: '#3b82f6' };
chaseTarget.sprite.position.set(500, 390); // 110px ahead
chaseTarget.data.vx = 0;
chaseTarget.data.vy = 0;
chasingAttacker.data.combatTarget = chaseTarget;

updateNpcCombat(chasingAttacker, 1, 1/60, [chasingAttacker, chaseTarget]);
assert.strictEqual(chasingAttacker.data.engineLitSprite.visible, false, 'Forward engine must NOT thrust at 110px when chasing at 50 px/s (already within effective weapon range)');
console.log('✓ Forward velocity gained by projectiles accounted for: standoff ship recognizes extended range while chasing');

console.log('--- 10. Testing Standoff Opens Fire on Target Engaging Near Edge of Range ---');
// Target is at 80px distance (edge of base range 87.5px) moving away at 40 px/s (relVy = -40).
// Previously, t = 1.333s exceeded lifetime * 1.5 (1.3125s), causing inRange to be false and withholding fire!
const edgeAttacker = buildShip(null, revEngine);
edgeAttacker.data.combatStrategy = 'standoff';
edgeAttacker.data.paint = { name: 'red', hex: '#ef4444' };
edgeAttacker.sprite.position.set(500, 500);
edgeAttacker.sprite.rotation = 0; // Facing north
edgeAttacker.data.vx = 0;
edgeAttacker.data.vy = 0;

const edgeTarget = buildShip();
edgeTarget.data.paint = { name: 'blue', hex: '#3b82f6' };
edgeTarget.sprite.position.set(500, 420); // 80px north
edgeTarget.data.vx = 0;
edgeTarget.data.vy = -40; // Moving away at 40 px/s
edgeAttacker.data.combatTarget = edgeTarget;

// Reset weapons
edgeAttacker.data.weapons[0].lastFired = -Infinity;
edgeAttacker.data.weaponGroups = null;
const beforeEdgeFire = edgeAttacker.data.weapons[0].lastFired;

const edgeLead = global.window.getLeadSolution(edgeAttacker, edgeTarget, 1.5);
assert.strictEqual(edgeLead.inRange, true, 'Target at 80px must be considered inRange even when moving away');

updateNpcCombat(edgeAttacker, 1, 1/60, [edgeAttacker, edgeTarget]);
assert(edgeAttacker.data.weapons[0].lastFired > beforeEdgeFire, 'Standoff ship MUST open fire when target engages from edge of weapon range');
assert.strictEqual(edgeAttacker.data.engineReverseSprite.visible, false, 'Standoff ship must not reverse when target is in sweet spot at 80px');
console.log('✓ Standoff ship consistently opens fire on target engaging from edge of range');

console.log('--- 11. Testing Target Min Range Stability while Moving Forward ---');
// When moving forward at 50 px/s and target is at 80px, targetMinRange should NOT blow up to >80px
// causing oscillating reverse-thrust maneuvers.
chasingAttacker.sprite.position.set(500, 500);
chasingAttacker.data.vx = 0;
chasingAttacker.data.vy = -50; // Moving forward at 50 px/s
chaseTarget.sprite.position.set(500, 420); // 80px ahead
chaseTarget.data.vx = 0;
chaseTarget.data.vy = -50; // Matched speed ahead

chasingAttacker.data.weapons[0].lastFired = -Infinity;
chasingAttacker.data.weaponGroups = null;
const beforeChaseFire = chasingAttacker.data.weapons[0].lastFired;

updateNpcCombat(chasingAttacker, 1, 1/60, [chasingAttacker, chaseTarget]);
assert.strictEqual(chasingAttacker.data.engineReverseSprite.visible, false, 'Ship at 80px must NOT engage reverse thrusters due to inflated min range');
assert(chasingAttacker.data.weapons[0].lastFired > beforeChaseFire, 'Ship chasing at 80px must open fire');
console.log('✓ Standoff min range remains stable at 63px and opens fire without reverse thruster jitter');

console.log('\nALL STANDOFF STRATEGY TESTS PASSED SUCCESSFULLY! 🎯🛡️');
