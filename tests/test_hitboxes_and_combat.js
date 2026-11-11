const path = require('path');
const assert = require('assert');
const fs = require('fs');

const mockElement = () => ({
  style: {},
  addEventListener: () => {},
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
    getRegisteredTicker: () => registeredTickerFn
  };
`);

const exportsObj = runCode();
const { setup, HULLS_DATA, WEAPONS_DATA, buildShip, checkSpeed, projectiles, spawnProjectile } = exportsObj;

console.log('1. Testing HULLS_DATA hitbox definitions...');
assert.strictEqual(HULLS_DATA.length, 10, 'Expected 10 hulls');
const expectedHullRadii = {
  Anvil: 7,
  Avocado: 7,
  Boat: 8,
  Crab: 7,
  Delta: 6,
  Hammer: 8,
  Protogon: 7,
  Shadow: 10,
  Shuttle: 6,
  Skate: 7,
};
for (const hull of HULLS_DATA) {
  assert.strictEqual(hull.hullRadius, expectedHullRadii[hull.name], `${hull.name} hullRadius must be ${expectedHullRadii[hull.name]}`);
  assert.strictEqual(hull.shieldRadius, 20, `${hull.name} shieldRadius must be 20`);
}
console.log('✓ All 10 hulls define their specific hullRadius and shieldRadius: 20');

console.log('2. Testing WEAPONS_DATA damage...');
assert.strictEqual(WEAPONS_DATA.light_blaster.damage, 1, 'light_blaster damage must be 1');
assert.strictEqual(WEAPONS_DATA.light_blaster.projectile.damage, 1, 'light_blaster projectile damage must be 1');
console.log('✓ WEAPONS_DATA damage: 1');

console.log('3. Testing buildShip health defaults...');
const shipA = buildShip();
assert.strictEqual(shipA.data.shield, 10, 'Initial shield must be 10');
assert.strictEqual(shipA.data.maxShield, 10, 'Initial maxShield must be 10');
assert.strictEqual(shipA.data.hullHealth, 10, 'Initial hullHealth must be 10');
assert.strictEqual(shipA.data.maxHullHealth, 10, 'Initial maxHullHealth must be 10');
assert.strictEqual(shipA.data.armor, 10, 'Initial armor must be 10');
assert.strictEqual(shipA.data.maxArmor, 10, 'Initial maxArmor must be 10');
assert.strictEqual(shipA.data.shieldHitTimer, 0, 'Initial shieldHitTimer must be 0');
console.log('✓ Ships initialized to 10 shield and 10 hull health');

console.log('4. Testing checkSpeed with distance/speed squared...');
const under = checkSpeed(30, 40, 100);
assert.strictEqual(under.vx, 30);
assert.strictEqual(under.vy, 40);
const over = checkSpeed(60, 80, 50);
assert.strictEqual(over.vx, 30);
assert.strictEqual(over.vy, 40);
console.log('✓ checkSpeed optimization works as expected');

console.log('5. Testing setup() execution and game loop...');
setup();
const gameLoopFn = registeredTickerFn;
assert(typeof gameLoopFn === 'function', 'gameLoop must be registered on ticker');
console.log('✓ setup() executed without errors');

// Test gameLoop ticks with derelictShip from getTargetableShips
const target = global.window.getTargetableShips()[0];
target.sprite.position.set(200, 200);

console.log('6. Testing gameLoop collision and shield absorption...');
// Advance 1 frame with no projectiles
gameLoopFn(1);

// Now simulate a projectile fired toward target at distance 15px (within 20px shield radius)
// target center is at (200, 200), place projectile at (200, 215)
const proj1 = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999, // Distinct ship ID
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
proj1.sprite.position.set(200, 215); // distance = 15px (< 20px shield radius)
global.app.stage.addChild(proj1.sprite);
projectiles.push(proj1);

assert.strictEqual(target.data.shield, 10, 'Shield should start at 10');
console.log('Target sprite position:', target.sprite.x, target.sprite.y, 'id:', target.data.id);
console.log('Proj1 sprite position:', proj1.sprite.x, proj1.sprite.y, 'shipId:', proj1.shipId);
// Run game loop frame (delta = 0 so no regen yet to check pure damage)
gameLoopFn(0);
console.log('After gameLoop, target shield:', target.data.shield, 'proj count:', projectiles.length);
assert.strictEqual(target.data.shield, 9, 'Shield should absorb 1 point of damage');
assert.strictEqual(target.data.hullHealth, 10, 'Hull health should remain untouched at 10');
assert.strictEqual(target.data.shieldHitTimer, 0.25, 'shieldHitTimer should be set to 0.25');
assert.strictEqual(projectiles.length, 0, 'Projectile should be consumed upon collision');
console.log('✓ Projectile at 15px absorbed by outer shield hitbox, reduced shield to 9, triggered shield effect');

console.log('7. Testing miss outside outer shield radius (25px > 20px)...');
const projMiss = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
projMiss.sprite.position.set(200, 225); // distance = 25px (> 20px)
global.app.stage.addChild(projMiss.sprite);
projectiles.push(projMiss);

gameLoopFn(0);
assert.strictEqual(target.data.shield, 9, 'Shield should remain at 9 on miss');
assert.strictEqual(projectiles.length, 1, 'Projectile should NOT be consumed on miss');
// Clean up miss projectile
projectiles.pop();
console.log('✓ Projectile at 25px correctly misses 20px outer hitbox');

console.log('8. Testing shields down: outer hitbox ignored, inner hitbox (6px) absorbs to hull...');
// Set shield to 0
target.data.shield = 0;
target.data.shieldHitTimer = 0;

// Projectile at 15px (which hit shield before):
const projPass = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
projPass.sprite.position.set(200, 215); // distance 15px (> 6px hull radius)
global.app.stage.addChild(projPass.sprite);
projectiles.push(projPass);

gameLoopFn(0);
assert.strictEqual(target.data.hullHealth, 10, 'Hull health should remain 10 because 15px > 6px');
assert.strictEqual(target.data.shieldHitTimer, 0, 'No shield effect when shields are down');
assert.strictEqual(projectiles.length, 1, 'Projectile at 15px passes through outer hitbox when shields down');
projectiles.pop();

// Now projectile at 5px (<= 6px hull radius):
const projHullHit = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
projHullHit.sprite.position.set(200, 205); // distance 5px (<= 6px)
global.app.stage.addChild(projHullHit.sprite);
projectiles.push(projHullHit);

gameLoopFn(0);
assert.strictEqual(target.data.hullHealth, 9, 'Hull health should drop to 9');
assert.strictEqual(target.data.armor, 9, 'Armor should be synced to 9');
assert.strictEqual(target.data.shieldHitTimer, 0, 'No shield effect when hull is hit');
assert.strictEqual(projectiles.length, 0, 'Projectile consumed by hull hit');
console.log('✓ With shields down, 15px passes through, 5px hits inner hull hitbox and damages hull health without shield circle');

console.log('9. Testing shield regeneration at 0.5 points per second with 1s delay after shields go down...');
// target took a hull hit, so shieldDownDelay is 1.0s
assert.strictEqual(target.data.shieldDownDelay, 1.0, 'shieldDownDelay must be 1.0 after shields go down/hull hit');

// Advance 0.5s (delta = 30): shield should still be 0
gameLoopFn(30);
assert.strictEqual(target.data.shield, 0, 'Shield must not recharge during 1-second delay');

// Advance another 0.5s (delta = 30, total 1.0s): delay finishes
gameLoopFn(30);
assert.strictEqual(target.data.shield, 0, 'Shield delay finishes at 1.0s');

// Advance 1 full second (delta = 60): shield should regenerate 0.5 points
gameLoopFn(60);
assert(Math.abs(target.data.shield - 0.5) < 0.001, `Shield should regenerate to 0.5 in 1 second, got ${target.data.shield}`);
assert.strictEqual(target.data.hullHealth, 9, 'Hull health should NOT regenerate (remains 9)');

// Advance another 5 seconds (5 * 60 = 300 delta): 0.5 + 5 * 0.5 = 3.0 points
gameLoopFn(300);
assert(Math.abs(target.data.shield - 3.0) < 0.001, `Shield should regenerate to 3.0 after 5 more seconds, got ${target.data.shield}`);
assert.strictEqual(target.data.hullHealth, 9, 'Hull health remains 9');

// Advance 20 more seconds: should clamp at maxShield (10)
gameLoopFn(1200);
assert.strictEqual(target.data.shield, 10, 'Shield should clamp at maxShield 10');
assert.strictEqual(target.data.hullHealth, 9, 'Hull health remains 9');
console.log('✓ Shield regenerates at 0.5 pt/s up to maxShield; hull does not regenerate');

console.log('10. Testing Target Monitor shield and armor readouts...');
// Call game loop or drawTargetView to refresh target monitor
gameLoopFn(0);
const targetShieldEl = domMap.get('target-shield-val');
const targetShieldBarEl = domMap.get('target-shield-bar');
const targetArmorEl = domMap.get('target-armor-val');
const targetArmorBarEl = domMap.get('target-armor-bar');

assert(targetShieldEl, 'target-shield-val element must exist');
assert(targetShieldBarEl, 'target-shield-bar element must exist');
assert(targetArmorEl, 'target-armor-val element must exist');
assert(targetArmorBarEl, 'target-armor-bar element must exist');

// target currently has shield: 10, hullHealth: 9
assert.strictEqual(targetShieldEl.textContent, '10 / 10', 'Target shield text should be 10 / 10');
assert.strictEqual(targetShieldBarEl.style.width, '100%', 'Target shield bar should be 100%');
assert.strictEqual(targetArmorEl.textContent, '9 / 10', 'Target armor text should be 9 / 10');
assert.strictEqual(targetArmorBarEl.style.width, '90%', 'Target armor bar should be 90%');

// Damage target shield to 5
target.data.shield = 5;
gameLoopFn(0);
assert.strictEqual(targetShieldEl.textContent, '5 / 10', 'Target shield text should be 5 / 10');
assert.strictEqual(targetShieldBarEl.style.width, '50%', 'Target shield bar should be 50%');

// Deplete shield to 0 and armor to 4
target.data.shield = 0;
target.data.hullHealth = 4;
target.data.armor = 4;
gameLoopFn(0);
assert.strictEqual(targetShieldEl.textContent, '0 / 10', 'Target shield text should be 0 / 10');
assert.strictEqual(targetShieldBarEl.style.width, '0%', 'Target shield bar should be 0%');
assert.strictEqual(targetArmorEl.textContent, '4 / 10', 'Target armor text should be 4 / 10');
assert.strictEqual(targetArmorBarEl.style.width, '40%', 'Target armor bar should be 40%');
console.log('✓ Target monitor displays target shield and armor levels and updates bars dynamically');

console.log('11. Testing partial block and projectile penetration...');
// Reset target: shield = 2, hullHealth = 10, shieldDownDelay = 0
target.data.shield = 2;
target.data.hullHealth = 10;
target.data.armor = 10;
target.data.shieldDownDelay = 0;

// Fire a projectile with damage = 5 at distance 15px (within 20px shield radius, but outside 6px hull radius)
const penetratingProj = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 5,
};
penetratingProj.sprite.position.set(200, 215); // distance 15px
global.app.stage.addChild(penetratingProj.sprite);
projectiles.push(penetratingProj);

gameLoopFn(0);
// Shield absorbed 2, dropping to 0
assert.strictEqual(target.data.shield, 0, 'Target shield should be drained to 0');
assert.strictEqual(target.data.shieldDownDelay, 1.0, 'shieldDownDelay should be set to 1.0');
assert.strictEqual(target.data.shieldHitTimer, 0.25, 'shield flare should trigger');
assert.strictEqual(target.data.hullHealth, 10, 'Hull health untouched because projectile is at 15px > 6px');
// Projectile damage reduced by 2 (from 5 to 3)
assert.strictEqual(penetratingProj.damage, 3, 'Projectile damage should be reduced to 3');
assert.strictEqual(projectiles.length, 1, 'Projectile should continue flying (not destroyed)');

// Now the projectile moves forward to distance 5px (inside 6px hull radius)
penetratingProj.sprite.position.set(200, 205);
gameLoopFn(0);
assert.strictEqual(target.data.hullHealth, 7, 'Hull health should drop by 3 (10 - 3 = 7)');
assert.strictEqual(target.data.armor, 7, 'Armor should be synced to 7');
assert.strictEqual(projectiles.length, 0, 'Projectile is destroyed upon impacting hull');
console.log('✓ Projectile partially blocked by shield (damage 5 -> 3), continues flying, and impacts hull for 3 damage');

// Now verify that shield does NOT recharge during the 1 second delay
gameLoopFn(30); // 0.5s
assert.strictEqual(target.data.shield, 0, 'Shield should not recharge during 1s delay');
gameLoopFn(30); // 1.0s (delay finishes)
assert.strictEqual(target.data.shield, 0, 'Shield reaches end of delay');
gameLoopFn(60); // 1.0s after delay: recharges 0.5 pt at 0.5 pt/s
assert(Math.abs(target.data.shield - 0.5) < 0.001, 'Shield recharges 0.5 pt/s after delay');
console.log('✓ One second delay after shields go down verified');

console.log('12. Testing disabled ship at <= 10% armor and destruction at 0 health...');
// Get an NPC fleet ship from getTargetableShips
const targetableList = global.window.getTargetableShips();
const testNpc = targetableList.find(s => s !== target);
testNpc.data.hullHealth = 10;
testNpc.data.armor = 10;
testNpc.data.shield = 0;
testNpc.data.vx = 50;
testNpc.data.vy = 50;
testNpc.sprite.position.set(300, 300);

// Reduce armor to 10% (1.0)
const hitTo10 = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 9, // leaves 1.0 health (10%)
};
hitTo10.sprite.position.set(300, 304); // distance 4px (<= 6px)
global.app.stage.addChild(hitTo10.sprite);
projectiles.push(hitTo10);

gameLoopFn(0);
assert.strictEqual(testNpc.data.hullHealth, 1, 'Hull health should be 1.0 (10%)');
assert.strictEqual(testNpc.data.isDisabled, true, 'Ship must be disabled at 10% armor');
assert.strictEqual(testNpc.data.aiState, 'DISABLED', 'aiState must be DISABLED');

// Test that shield CANNOT regenerate for disabled ship
gameLoopFn(120); // 2 full seconds
assert.strictEqual(testNpc.data.shield, 0, 'Disabled ship must lose all shield regeneration');

// Test drifting to a stop
assert(testNpc.data.vx > 0, 'Should start moving');
for (let f = 0; f < 100; f++) {
  gameLoopFn(1);
}
assert.strictEqual(testNpc.data.vx, 0, 'Disabled ship must slowly drift to a dead stop in space (vx = 0)');
assert.strictEqual(testNpc.data.vy, 0, 'Disabled ship must slowly drift to a dead stop in space (vy = 0)');
console.log('✓ Disabled ship loses shield regeneration and drifts to a stop');

// Now damage it to 0 health: should be destroyed (deleted)
const killHit = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
killHit.sprite.position.set(300, 304);
global.app.stage.addChild(killHit.sprite);
projectiles.push(killHit);

gameLoopFn(0);
assert.strictEqual(testNpc.data.hullHealth, 0, 'Hull health should be 0');
assert.strictEqual(testNpc.data.isDestroyed, true, 'Ship must be marked isDestroyed');
assert.strictEqual(testNpc.sprite.destroyed, true, 'Ship sprite must be destroyed');
assert(!global.window.getTargetableShips().includes(testNpc), 'Destroyed ship must not be in targetable ships');
console.log('✓ Ship that reaches zero health is destroyed and deleted');

console.log('12. Testing per-model hitbox collision differences (Shadow 10px vs Shuttle 6px)...');
const shadowHull = HULLS_DATA.find(h => h.name === 'Shadow');
const shuttleHull = HULLS_DATA.find(h => h.name === 'Shuttle');
const shadowNpc = buildShip(shadowHull);
shadowNpc.data.shield = 0;
shadowNpc.sprite.position.set(400, 400);
global.app.stage.addChild(shadowNpc.sprite);
global.window.ships.push(shadowNpc);

const shuttleNpc = buildShip(shuttleHull);
shuttleNpc.data.shield = 0;
shuttleNpc.sprite.position.set(600, 400);
global.app.stage.addChild(shuttleNpc.sprite);
global.window.ships.push(shuttleNpc);

// Projectile 9px away from Shadow center: hits Shadow (radius 10)
const projShadow = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
projShadow.sprite.position.set(400, 409); // dist = 9px <= 10px
global.app.stage.addChild(projShadow.sprite);
projectiles.push(projShadow);

// Projectile 9px away from Shuttle center: misses Shuttle (radius 6)
const projShuttle = {
  sprite: new PIXI.Sprite(),
  vx: 0,
  vy: 0,
  rotation: 0,
  rotationSpeed: 0,
  shipId: 99999,
  originTime: 1000,
  lifetime: 1.0,
  damage: 1,
};
projShuttle.sprite.position.set(600, 409); // dist = 9px > 6px
global.app.stage.addChild(projShuttle.sprite);
projectiles.push(projShuttle);

gameLoopFn(0);
assert.strictEqual(shadowNpc.data.hullHealth, 9, 'Shadow (10px radius) must be hit at 9px distance');
assert.strictEqual(shuttleNpc.data.hullHealth, 10, 'Shuttle (6px radius) must NOT be hit at 9px distance');
// Clean up remaining projectile
projectiles.length = 0;
console.log('✓ Per-model hitbox collision radius accurately distinguishes Shadow (10px) from Shuttle (6px)');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🚀');
