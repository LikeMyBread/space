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
// Standoff weapon range is 87.5 * 1.5 = 131.25px. targetMaxRange is 131.25 * 0.92 = 120.75px.
// Move target to 150px away (beyond max standoff range)
target.sprite.position.set(500, 350); // dist = 150px
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

console.log('--- 12. Testing Strategy Sub-State Tracking & UI Display ---');

// 1. Formatting via getStrategyDisplayName
assert.strictEqual(getStrategyDisplayName('standoff', 'CLOSING'), 'STANDOFF: CLOSING');
assert.strictEqual(getStrategyDisplayName('standoff', 'HOLDING RANGE'), 'STANDOFF: HOLDING RANGE');
assert.strictEqual(getStrategyDisplayName('standoff', 'BACKING OFF'), 'STANDOFF: BACKING OFF');
assert.strictEqual(getStrategyDisplayName('standoff', 'BRAKING'), 'STANDOFF: BRAKING');
assert.strictEqual(getStrategyDisplayName('turn_fight', 'IN POCKET'), 'TURN FIGHT: IN POCKET');
assert.strictEqual(getStrategyDisplayName('turn_fight', 'COASTING ON COURSE'), 'TURN FIGHT: COASTING ON COURSE');
assert.strictEqual(getStrategyDisplayName('turn_fight', 'MANEUVERING TO REAR'), 'TURN FIGHT: MANEUVERING TO REAR');
assert.strictEqual(getStrategyDisplayName('joust', 'ATTACK RUN'), 'JOUSTING: ATTACK RUN');
assert.strictEqual(getStrategyDisplayName('joust', 'EXTENDING'), 'JOUSTING: EXTENDING');
assert.strictEqual(getStrategyDisplayName('standoff'), 'STANDOFF');
console.log('✓ getStrategyDisplayName formats sub-states correctly and preserves fallback format');

// 2. Dynamic strategySubState assignment in updateNpcCombat
const subStateAttacker = buildShip(null, revEngine);
subStateAttacker.data.combatStrategy = 'standoff';
subStateAttacker.data.paint = { name: 'red', hex: '#ef4444' };
subStateAttacker.sprite.position.set(500, 500);
subStateAttacker.sprite.rotation = 0; // Facing north
subStateAttacker.data.vx = 0;
subStateAttacker.data.vy = 0;

const subStateTarget = buildShip(null, revEngine);
subStateTarget.data.paint = { name: 'blue', hex: '#3b82f6' };
subStateTarget.sprite.position.set(500, 200); // 300px away (> targetMaxRange)
subStateAttacker.data.combatTarget = subStateTarget;

// A. Beyond max range -> CLOSING
updateNpcCombat(subStateAttacker, 1, 1/60, [subStateAttacker, subStateTarget]);
assert.strictEqual(subStateAttacker.data.strategySubState, 'CLOSING', 'Standoff beyond max range must be CLOSING');

// B. Sweet spot (75px & 100px away, targetMaxRange ~120.75px, targetMinRange ~63px) -> HOLDING RANGE
subStateTarget.sprite.position.set(500, 425); // 75px
subStateAttacker.data.vx = 0;
subStateAttacker.data.vy = 0;
updateNpcCombat(subStateAttacker, 1, 1/60, [subStateAttacker, subStateTarget]);
assert.strictEqual(subStateAttacker.data.strategySubState, 'HOLDING RANGE', 'Standoff in sweet spot at 75px must be HOLDING RANGE');

subStateTarget.sprite.position.set(500, 400); // 100px (well within 1.5x weapon range)
subStateAttacker.data.vx = 0;
subStateAttacker.data.vy = 0;
updateNpcCombat(subStateAttacker, 1, 1/60, [subStateAttacker, subStateTarget]);
assert.strictEqual(subStateAttacker.data.strategySubState, 'HOLDING RANGE', 'Standoff at 100px must be in HOLDING RANGE stage (not stuck in CLOSING)');

// C. Inside min range (30px away < targetMinRange) -> BACKING OFF
subStateTarget.sprite.position.set(500, 470);
subStateAttacker.data.vx = 0;
subStateAttacker.data.vy = 0;
updateNpcCombat(subStateAttacker, 1, 1/60, [subStateAttacker, subStateTarget]);
assert.strictEqual(subStateAttacker.data.strategySubState, 'BACKING OFF', 'Standoff inside min range with reversible engine must be BACKING OFF');

// D. Fast closing speed near min range boundary -> BRAKING
subStateTarget.sprite.position.set(500, 432); // ~68px away (close to targetMinRange + 15)
subStateAttacker.data.vx = 0;
subStateAttacker.data.vy = -35; // Closing fast at 35px/s along line of sight
updateNpcCombat(subStateAttacker, 1, 1/60, [subStateAttacker, subStateTarget]);
assert.strictEqual(subStateAttacker.data.strategySubState, 'BRAKING', 'Standoff closing fast near min range boundary must be BRAKING');

// E. Retreating
subStateAttacker.data.shield = 0;
subStateAttacker.data.aiState = 'RETREAT';
subStateAttacker.data.isRetreating = true;
// With leader
const redLeader = buildShip();
redLeader.data.id = 1;
redLeader.data.paint = { name: 'red', hex: '#ef4444' };
redLeader.sprite.position.set(500, 800);
subStateAttacker.data.id = 50;
updateNpcCombat(subStateAttacker, 1, 1/60, [subStateAttacker, redLeader, subStateTarget]);
assert.strictEqual(subStateAttacker.data.strategySubState, 'TO LEADER', 'Retreating ship with fleet leader must have substate TO LEADER');

// Without leader
const lonelyAttacker = buildShip();
lonelyAttacker.data.id = 99;
lonelyAttacker.data.paint = { name: 'purple', hex: '#a855f7' };
lonelyAttacker.data.shield = 0;
lonelyAttacker.data.aiState = 'RETREAT';
lonelyAttacker.data.isRetreating = true;
lonelyAttacker.sprite.position.set(500, 500);
updateNpcCombat(lonelyAttacker, 1, 1/60, [lonelyAttacker, subStateTarget]);
assert.strictEqual(lonelyAttacker.data.strategySubState, 'FLEEING', 'Retreating ship without fleet leader must have substate FLEEING');

// F. Jousting sub-states: ATTACK RUN when approaching, EXTENDING when separating
const testJouster = buildShip();
testJouster.data.combatStrategy = 'joust';
testJouster.data.paint = { name: 'gold', hex: '#fbbf24' };
testJouster.sprite.position.set(500, 500);
testJouster.sprite.rotation = 0; // facing north
testJouster.data.vx = 0;
testJouster.data.vy = -testJouster.data.maxSpeed; // charging north at max speed

const joustOpponent = buildShip();
joustOpponent.data.paint = { name: 'red', hex: '#ef4444' };
joustOpponent.sprite.position.set(500, 350); // 150px north (approaching head-on)
joustOpponent.data.vx = 0;
joustOpponent.data.vy = 0;
testJouster.data.combatTarget = joustOpponent;

updateNpcCombat(testJouster, 1, 1/60, [testJouster, joustOpponent]);
assert.strictEqual(testJouster.data.strategySubState, 'ATTACK RUN', 'Jousting ship approaching target from 150px must be on ATTACK RUN (not stuck in EXTENDING)');

// When separating after a pass (opponent behind jouster at 100px, moving away)
joustOpponent.sprite.position.set(500, 600); // 100px south (behind jouster moving north)
updateNpcCombat(testJouster, 1, 1/60, [testJouster, joustOpponent]);
assert.strictEqual(testJouster.data.strategySubState, 'EXTENDING', 'Jousting ship separating past opponent must be in EXTENDING stage');

console.log('✓ Dynamic strategySubState assigns CLOSING, HOLDING RANGE, BACKING OFF, BRAKING, TO LEADER, FLEEING, ATTACK RUN, and EXTENDING accurately');

// 3. Target Monitor UI updates
const targetStateEl = domMap.get('target-state-val');
assert(targetStateEl, 'target-state-val element must exist in DOM');

// Select a target ship to display
const monitoredShip = (global.window.ships && global.window.ships.length > 0) ? global.window.ships[0] : buildShip();
if (global.window.ships && global.window.ships.length > 0) {
  while (global.window.getCurrentTarget() !== monitoredShip) {
    global.window.cycleTarget();
  }
}
monitoredShip.data.isDisabled = false;
monitoredShip.data.isDestroyed = false;
monitoredShip.data.aiState = 'COMBAT';
monitoredShip.data.combatStrategy = 'standoff';
monitoredShip.data.strategySubState = 'CLOSING';

global.window.isFighting = true;
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'STANDOFF: CLOSING', 'Target monitor must show STANDOFF: CLOSING');

monitoredShip.data.strategySubState = 'HOLDING RANGE';
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'STANDOFF: HOLDING RANGE', 'Target monitor must show STANDOFF: HOLDING RANGE');

monitoredShip.data.strategySubState = 'BACKING OFF';
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'STANDOFF: BACKING OFF', 'Target monitor must show STANDOFF: BACKING OFF');

// Disabled priority
monitoredShip.data.isDisabled = true;
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'DISABLED', 'Target monitor must show DISABLED when disabled');

console.log('✓ Target monitor STATE element displays current combat strategy and substate (e.g. STANDOFF: HOLDING RANGE)');

console.log('\nALL STANDOFF STRATEGY TESTS PASSED SUCCESSFULLY! 🎯🛡️');
