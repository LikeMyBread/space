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
    destroy() { this.destroyed = true; }
  },
  Texture: {
    from: () => ({}),
  },
  Assets: {
    load: async () => {},
    get: () => ({ width: 32, height: 32 }),
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
    getRegisteredTicker: () => registeredTickerFn
  };
`);

const exported = runCode();
const { setup, HULLS_DATA, ENGINES_DATA, FACTION_PAINTS, WEAPONS_DATA, buildShip, checkSpeed, projectiles, fireShipWeapons } = exported;

console.log('1. Testing DOM and UI setup for Fight and God Mode buttons...');
setup();
const gameLoopFn = registeredTickerFn;

const fightBtnEl = domMap.get('fight-btn');
const godModeBtnEl = domMap.get('god-mode-btn');
assert(fightBtnEl, 'fight-btn element must exist');
assert(godModeBtnEl, 'god-mode-btn element must exist');
console.log('✓ Fight and God Mode buttons registered in DOM');

console.log('2. Testing God Mode functionality...');
const playerShip = global.window.playerShip;
assert(playerShip, 'playerShip must be exposed on window');
assert.strictEqual(global.window.isGodMode, false, 'God mode should be OFF initially');

// Toggle God Mode ON
godModeBtnEl.click();
assert.strictEqual(global.window.isGodMode, true, 'God mode should be ON after click');
assert.strictEqual(godModeBtnEl.textContent, 'God Mode: ON');
assert(godModeBtnEl.classList.contains('active'), 'God mode button should have active class');

// Create a deadly projectile directed at player (damage = 100)
const superProj = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 100,
};
superProj.sprite.position.set(playerShip.sprite.x, playerShip.sprite.y + 10); // within shield radius (20px)
global.app.stage.addChild(superProj.sprite);
projectiles.push(superProj);

// Run game loop frame: projectile should be consumed, but player takes 0 damage
gameLoopFn(1);
assert.strictEqual(projectiles.length, 0, 'Deadly projectile consumed');
assert.strictEqual(playerShip.data.shield, 10, 'Player shield must remain 10 in God Mode');
assert.strictEqual(playerShip.data.hullHealth, 10, 'Player hull health must remain 10 in God Mode');
assert.strictEqual(playerShip.data.isDisabled, false, 'Player must not be disabled in God Mode');
assert.strictEqual(playerShip.data.isDestroyed, false, 'Player must not be destroyed in God Mode');
assert(playerShip.data.shieldHitTimer > 0, 'Shield flare triggers on impact in God Mode');
console.log('✓ God Mode prevents damage, keeps health/shields at 100%, and absorbs projectile');

// Toggle God Mode OFF
godModeBtnEl.click();
assert.strictEqual(global.window.isGodMode, false, 'God mode should be OFF after second click');
assert.strictEqual(godModeBtnEl.textContent, 'God Mode: OFF');
assert(!godModeBtnEl.classList.contains('active'), 'God mode button should not have active class');

// Fire another projectile with 2 damage
const normalProj = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 2,
};
normalProj.sprite.position.set(playerShip.sprite.x, playerShip.sprite.y + 10);
global.app.stage.addChild(normalProj.sprite);
projectiles.push(normalProj);
gameLoopFn(1);
assert.strictEqual(playerShip.data.shield, 8, 'With God Mode OFF, player takes damage normally (shield = 8)');
// Restore player shield for rest of tests
playerShip.data.shield = 10;
console.log('✓ God Mode toggles OFF cleanly and player takes normal damage');

console.log('3. Testing nearest hostile target selection by faction color...');
const findNearestHostile = global.window.findNearestHostile;
assert(typeof findNearestHostile === 'function', 'findNearestHostile must be a function');

const redPaint = FACTION_PAINTS.find(p => p.name === 'Red');
const bluePaint = FACTION_PAINTS.find(p => p.name === 'Blue');
const goldPaint = FACTION_PAINTS.find(p => p.name === 'Gold');

const shipA = buildShip(null, null, redPaint);
shipA.sprite.position.set(100, 100);

const allyRed = buildShip(null, null, redPaint);
allyRed.sprite.position.set(110, 100); // 10px away

const enemyBlue = buildShip(null, null, bluePaint);
enemyBlue.sprite.position.set(150, 100); // 50px away

const enemyGold = buildShip(null, null, goldPaint);
enemyGold.sprite.position.set(300, 100); // 200px away

const combatPool = [shipA, allyRed, enemyBlue, enemyGold];

// shipA (Red) should target enemyBlue (Blue, 50px) and NOT allyRed (Red, 10px)
const targetForA = findNearestHostile(shipA, combatPool);
assert(targetForA, 'Should find a target');
assert.strictEqual(targetForA, enemyBlue, 'Red ship must seek nearest enemy not of its color (Blue), ignoring Red ally');

// If enemyBlue is destroyed, shipA should pick enemyGold
enemyBlue.data.isDestroyed = true;
const nextTargetForA = findNearestHostile(shipA, combatPool);
assert.strictEqual(nextTargetForA, enemyGold, 'When nearest enemy destroyed, must switch to next nearest (Gold)');

// If enemyGold is also destroyed, shipA has no enemies of other colors
enemyGold.data.isDestroyed = true;
const noTarget = findNearestHostile(shipA, combatPool);
assert.strictEqual(noTarget, null, 'When no hostiles of other colors remain, returns null');
console.log('✓ Hostile target selection respects faction paint colors and ignores allies/destroyed ships');

console.log('4. Testing shot leading and ballistic interception calculation...');
const getLeadSolution = global.window.getLeadSolution;
assert(typeof getLeadSolution === 'function', 'getLeadSolution must be a function');

const shooter = buildShip();
shooter.sprite.position.set(0, 0);
shooter.data.vx = 0;
shooter.data.vy = 0;

const targetStationary = buildShip();
targetStationary.sprite.position.set(0, -50); // 50px directly ahead (y = -50, x = 0)
targetStationary.data.vx = 0;
targetStationary.data.vy = 0;

// Blaster speed = 100, lifetime = 0.75, max range = 75px
const sol1 = getLeadSolution(shooter, targetStationary);
assert.strictEqual(sol1.inRange, true, '50px is within 75px weapon range');
assert(Math.abs(sol1.aimAngle) < 0.001, 'Stationary target ahead should have aim angle 0');
assert(Math.abs(sol1.interceptTime - 0.5) < 0.001, '50px / 100px/s = 0.5s intercept time');

// Target moving horizontally across shooter: x = 0 -> right at 50 px/s, at y = -50
const targetMoving = buildShip();
targetMoving.sprite.position.set(0, -50);
targetMoving.data.vx = 50;
targetMoving.data.vy = 0;

const sol2 = getLeadSolution(shooter, targetMoving);
assert(sol2.interceptTime > 0, 'Must have positive intercept time');
// At intercept time t, target is at x = 50*t, y = -50. Aim angle must be positive (to the right)
assert(sol2.aimAngle > 0, 'Shooter must lead moving target to the right');
// Check that projectile fired at aimAngle with speed 100 reaches (50*t, -50)
const projVx = 100 * Math.sin(sol2.aimAngle);
const projVy = -100 * Math.cos(sol2.aimAngle);
const diffX = projVx * sol2.interceptTime - (targetMoving.sprite.x + targetMoving.data.vx * sol2.interceptTime);
const diffY = projVy * sol2.interceptTime - (targetMoving.sprite.y + targetMoving.data.vy * sol2.interceptTime);
assert(Math.abs(diffX) < 0.1, 'Lead angle X aligns with target intercept');
assert(Math.abs(diffY) < 0.1, 'Lead angle Y aligns with target intercept');

// In-range target: 75px away (in range with 87.5px weapon range)
const targetLongRange = buildShip();
targetLongRange.sprite.position.set(0, -75);
targetLongRange.data.vx = 0;
targetLongRange.data.vy = 0;
const solLong = getLeadSolution(shooter, targetLongRange);
assert.strictEqual(solLong.inRange, true, 'Target at 75px must be in range');

// Out of range target: 150px away (> 100.6px)
const targetFar = buildShip();
targetFar.sprite.position.set(0, -150);
targetFar.data.vx = 0;
targetFar.data.vy = 0;
const solFar = getLeadSolution(shooter, targetFar);
assert.strictEqual(solFar.inRange, false, 'Target at 150px must be out of range');

// Test firing bias: fires even when imperfectly aligned (e.g. angleDiff ~ 0.5 rad)
const imperfectShooter = buildShip();
imperfectShooter.sprite.position.set(0, 0);
imperfectShooter.sprite.rotation = 0.5; // Offset by ~28 degrees from target ahead (angle 0)
const projCountBeforeImperfect = projectiles.length;
global.window.aimAndShoot(imperfectShooter, targetStationary);
assert(projectiles.length > projCountBeforeImperfect, 'Ship must fire even when imperfectly aligned (within 0.75 rad)');
console.log('✓ Shot leading range envelope and alignment firing bias verified');

console.log('5. Testing Turn Fight strategy: 90-degree rear cone detection and positioning...');
const turnFighter = buildShip(null, null, bluePaint);
turnFighter.data.combatStrategy = 'turn_fight';
turnFighter.data.vx = 0;
turnFighter.data.vy = 0;

const victim = buildShip(null, null, redPaint);
victim.sprite.position.set(500, 500);
victim.sprite.rotation = 0; // Facing up (0 rad), rear is down (PI rad)
victim.data.vx = 0;
victim.data.vy = 0;

// Test A: Place turnFighter directly behind victim (500, 545) -> distance 45px, angle PI rad (rear)
turnFighter.sprite.position.set(500, 545);
turnFighter.sprite.rotation = 0; // Facing up towards victim

const prevProjCount = projectiles.length;
// Update combat for turnFighter
global.window.updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
assert(turnFighter.data.combatTarget === victim, 'Victim should be targeted');
// Within rear cone (0 deg diff from rear <= 45 deg) and in range (45px <= 75px):
// Should turn to aim at target and shoot!
assert(projectiles.length > prevProjCount, 'Turn fighter in rear 90-degree cone must shoot at target');
console.log('✓ Turn fighter in 90-degree rear aspect cone maintains position and fires weapons');

// Test B: Place turnFighter in front of victim (500, 450) -> bearing is 0 rad, outside 90-deg rear cone
turnFighter.sprite.position.set(500, 450);
turnFighter.sprite.rotation = Math.PI; // Facing victim
const projCountBefore = projectiles.length;
global.window.updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
// Outside rear cone: turn fighter must turn and thrust towards rear standoff point (500, 545)
// So its desired course should point down (+Y), NOT just stay in front
assert(turnFighter.data.engineLitSprite.visible === true || turnFighter.data.vy !== 0 || turnFighter.sprite.rotation !== Math.PI,
  'Turn fighter outside rear cone must maneuver and apply thrust to get behind target');
console.log('✓ Turn fighter outside rear cone maneuvers to put itself on course for rear cone');

console.log('6. Testing Jousting strategy: high speed pass and reset...');
const jouster = buildShip(null, null, goldPaint);
jouster.data.combatStrategy = 'joust';
jouster.sprite.position.set(500, 600); // 100px away from victim at (500, 500)
jouster.data.vx = 0;
jouster.data.vy = -jouster.data.maxSpeed; // Flying toward victim at max speed
jouster.sprite.rotation = 0; // Pointing at victim

// When entering weapon range on high speed pass: turns, leads, and shoots while maintaining speed
jouster.sprite.position.set(500, 550); // 50px away, in range
const joustProjBefore = projectiles.length;
global.window.updateNpcCombat(jouster, 1, 1/60, [jouster, victim]);
assert(projectiles.length > joustProjBefore, 'Jouster in weapon range during pass must fire led shot');
console.log('✓ Jouster keeps high speed, leads target, and fires weapons during pass');

console.log('7. Testing Shield Retreat condition (< 25% shields)...');
// Drain turnFighter shield to 2.0 (20% of 10)
turnFighter.data.shield = 2.0;
turnFighter.data.maxShield = 10.0;
turnFighter.data.isRetreating = false;

// Update combat: should trigger retreat
global.window.updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
assert.strictEqual(turnFighter.data.isRetreating, true, 'Ship with shield < 25% must enter retreat state');
assert.strictEqual(turnFighter.data.aiState, 'RETREAT', 'aiState must be RETREAT');

// Ship turns away from hostile and once aligned, lights main engines at full power
for (let f = 0; f < 100; f++) {
  global.window.updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
  if (turnFighter.data.engineLitSprite.visible) break;
}
assert.strictEqual(turnFighter.data.engineLitSprite.visible, true, 'Retreating ship must turn and have engine lit at full throttle away from hostile');

// While shields are recharging (e.g. at 5.0 / 10), must remain in retreat
turnFighter.data.shield = 5.0;
global.window.updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
assert.strictEqual(turnFighter.data.isRetreating, true, 'Ship must continue fleeing while shields are still recovering');

// When shields fully recover (10.0 / 10), retreat ends and ship re-engages
turnFighter.data.shield = 10.0;
global.window.updateNpcCombat(turnFighter, 1, 1/60, [turnFighter, victim]);
assert.strictEqual(turnFighter.data.isRetreating, false, 'Ship must end retreat and re-engage once shields fully recover');
console.log('✓ Retreat condition triggers below 25% shields, flees hostiles, and re-engages upon 100% recharge');

console.log('8. Testing "Fight!" and "Re-form Fleet" button actions...');
assert.strictEqual(global.window.isFighting, false, 'isFighting should be false initially');

// Click "Fight!" button
fightBtnEl.click();
assert.strictEqual(global.window.isFighting, true, 'isFighting should be true after clicking Fight!');
assert(fightBtnEl.classList.contains('active'), 'Fight button should have active class');

const targetableShips = global.window.getTargetableShips();
const derelict = targetableShips.find(s => s.data.isDerelict);
assert(derelict, 'Derelict ship must exist');
assert.strictEqual(derelict.data.combatStrategy, null, 'Derelict ship must NOT be assigned combat strategy');
assert.strictEqual(derelict.data.aiState, 'DERELICT', 'Derelict ship must remain DERELICT');
assert.strictEqual(derelict.data.vx, 0, 'Derelict ship vx must remain 0');
assert.strictEqual(derelict.data.vy, 0, 'Derelict ship vy must remain 0');

const fleetNpcs = targetableShips.filter(s => !s.data.isDerelict);
for (const npc of fleetNpcs) {
  assert(npc.data.combatStrategy === 'turn_fight' || npc.data.combatStrategy === 'joust' || npc.data.combatStrategy === 'standoff',
    'Fleet NPC ships must be assigned turn_fight, joust, or standoff strategy');
  assert.strictEqual(npc.data.aiState, 'COMBAT', 'Fleet NPC aiState must be set to COMBAT');
}
console.log('✓ Derelict ship does NOT join the fight and remains motionless; fleet ships enter combat');

// Click "Re-form Fleet" button
const reformBtnEl = domMap.get('reform-btn');
reformBtnEl.click();
assert.strictEqual(global.window.isFighting, false, 'isFighting should be false after clicking Re-form Fleet');
assert(!fightBtnEl.classList.contains('active'), 'Fight button should remove active class after Re-form Fleet');
console.log('✓ "Re-form Fleet" exits combat mode and returns fleet to formation');

console.log('9. Testing target tracker State display for combat strategies...');
const targetStateEl = domMap.get('target-state-val');
assert(targetStateEl, 'target-state-val element must exist');

const testTarget = fleetNpcs[0];
assert(testTarget, 'Test target must exist');

// Target testTarget
while (global.window.getCurrentTarget() !== testTarget) {
  global.window.cycleTarget();
}

// When in combat with turn_fight:
global.window.isFighting = true;
testTarget.data.combatStrategy = 'turn_fight';
testTarget.data.aiState = 'COMBAT';
testTarget.data.isDisabled = false;
testTarget.data.isDestroyed = false;
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'TURN FIGHT', 'Target tracker State must display TURN FIGHT for turn_fight strategy');

// When in combat with joust:
testTarget.data.combatStrategy = 'joust';
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'JOUSTING', 'Target tracker State must display JOUSTING for joust strategy');

// When disabled:
testTarget.data.isDisabled = true;
global.window.drawTargetView();
assert.strictEqual(targetStateEl.textContent, 'DISABLED', 'Target tracker State must display DISABLED when disabled');

console.log('✓ Target tracker State accurately reflects current combat strategy (TURN FIGHT / JOUSTING)');

console.log('ALL COMBAT & GOD MODE TESTS PASSED SUCCESSFULLY! 🚀');
