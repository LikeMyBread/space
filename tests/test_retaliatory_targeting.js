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
const { setup, buildShip, ENGINES_DATA, FACTION_PAINTS, WEAPONS_DATA, projectiles, spawnProjectile, fireShipWeapons } = exported;

setup();
const gameLoop = global.window.gameLoop;
const playerShip = global.window.playerShip;
const updateNpcCombat = global.window.updateNpcCombat;
const handleShipHit = global.window.handleShipHit;

console.log('--- 1. Testing Projectile Parent Assignment ---');
const shooter = buildShip();
shooter.sprite.position.set(200, 200);
shooter.data.vx = 0;
shooter.data.vy = 0;
const weaponSlot = shooter.data.weapons[0];

const projCountBefore = projectiles.length;
spawnProjectile(shooter, weaponSlot);
assert.strictEqual(projectiles.length, projCountBefore + 1, 'Projectile should be spawned');
const spawnedProj = projectiles[projectiles.length - 1];
assert.strictEqual(spawnedProj.shipId, shooter.data.id, 'Projectile shipId must match shooter id');
assert.strictEqual(spawnedProj.parentShip, shooter, 'Projectile parentShip must reference the shooting ship');
assert.strictEqual(spawnedProj.ship, shooter, 'Projectile ship property must reference the shooting ship');
assert.strictEqual(spawnedProj.parent, shooter, 'Projectile parent property must reference the shooting ship');
console.log('✓ Projectile correctly retains parentShip, ship, and parent references to firing ship');

console.log('--- 2. Testing NPC Ship Hit Switches Target to Attacker ---');
const redPaint = FACTION_PAINTS.find(p => p.name.includes('Vanguard')) || FACTION_PAINTS[0];
const bluePaint = FACTION_PAINTS.find(p => p.name.includes('Aegis')) || FACTION_PAINTS[1];
const greenPaint = FACTION_PAINTS.find(p => p.name.includes('Nova')) || FACTION_PAINTS[2];

const shipA = buildShip(null, null, redPaint);
shipA.sprite.position.set(500, 500);
const shipB = buildShip(null, null, bluePaint);
shipB.sprite.position.set(700, 500);
const shipC = buildShip(null, null, greenPaint);
shipC.sprite.position.set(500, 250);

// Ship A initially targets Ship B
shipA.data.combatTarget = shipB;
shipA.data.combatStrategy = 'standoff';
assert.strictEqual(shipA.data.combatTarget, shipB, 'Ship A should initially target Ship B');

// Ship C fires a projectile that hits Ship A
const projFromC = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  container: null,
  vx: 0,
  vy: 100,
  shipId: shipC.data.id,
  parentShip: shipC,
  damage: 2,
};

handleShipHit(shipA, projFromC, [shipA, shipB, shipC]);
assert.strictEqual(shipA.data.combatTarget, shipC, 'Ship A must switch target to Ship C upon being hit');
console.log('✓ Ship A switched combatTarget to Ship C as the most immediate threat');

// Verify updateNpcCombat respects the new target
updateNpcCombat(shipA, 1, 1/60, [shipA, shipB, shipC]);
assert.strictEqual(shipA.data.combatTarget, shipC, 'Ship A must keep Ship C as target during combat loop');
console.log('✓ Combat AI continues targeting the attacker');

console.log('--- 3. Testing Sequential Target Switching on Successive Hits ---');
// Now Ship B hits Ship A
const projFromB = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  container: null,
  vx: -100,
  vy: 0,
  shipId: shipB.data.id,
  parentShip: shipB,
  damage: 2,
};
handleShipHit(shipA, projFromB, [shipA, shipB, shipC]);
assert.strictEqual(shipA.data.combatTarget, shipB, 'Ship A must switch target to Ship B when hit by Ship B');
console.log('✓ Target sequentially updates to latest attacker');

console.log('--- 4. Testing Player Ship Hit Does NOT Switch Player Target ---');
// Ensure ships are registered in targetable list
global.window.ships.push(shipB, shipC);
// Player is currently targeting Ship B
global.window.currentTargetId = shipB.data.id;
playerShip.data.combatTarget = shipB;
assert.strictEqual(global.window.getCurrentTarget(), shipB, 'Player should initially target Ship B');

// Ship C fires and hits Player Ship
const projHittingPlayer = {
  particle: { x: playerShip.sprite.x, y: playerShip.sprite.y, rotation: 0 },
  sprite: { x: playerShip.sprite.x, y: playerShip.sprite.y, rotation: 0 },
  container: null,
  vx: 0,
  vy: 100,
  shipId: shipC.data.id,
  parentShip: shipC,
  damage: 1,
};
handleShipHit(playerShip, projHittingPlayer, [playerShip, shipA, shipB, shipC]);
assert.strictEqual(global.window.getCurrentTarget(), shipB, 'Player target tracker must NOT switch when player is hit');
assert.strictEqual(playerShip.data.combatTarget, shipB, 'playerShip combatTarget must remain Ship B');
console.log('✓ Retaliatory targeting does NOT apply to the player (player target unchanged on hit)');

console.log('--- 5. Testing Full Projectile Collision Loop in gameLoop() ---');
// Clear existing projectiles
projectiles.length = 0;
if (!global.window.ships.includes(shipA)) global.window.ships.push(shipA);
// Place shipA at (500, 500) with full shield
shipA.data.shield = 10;
shipA.data.hullHealth = 10;
shipA.data.isDestroyed = false;
shipA.data.combatTarget = shipB;

// Spawn projectile directly on shipA's position from shipC
projectiles.push({
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  container: null,
  vx: 0,
  vy: 0,
  shipId: shipC.data.id,
  parentShip: shipC,
  originTime: performance.now(),
  lifetime: 3.5,
  damage: 2,
});

// Run a frame of gameLoop with delta = 1
gameLoop(1);
assert.strictEqual(shipA.data.shield, 8, 'Shield should absorb 2 damage');
assert.strictEqual(shipA.data.combatTarget, shipC, 'shipA combatTarget must be switched to shipC through gameLoop collision');
console.log('✓ Full collision physics in gameLoop switches target on shield hit');

console.log('--- 6. Testing Friendly Fire Benefit of the Doubt ---');
// Both ships have redPaint (same faction)
const allyRed = buildShip(null, null, redPaint);
allyRed.sprite.position.set(500, 600);
shipA.data.combatTarget = shipC; // Prior target (hostile)

const friendlyProj = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  container: null,
  vx: 0,
  vy: 0,
  shipId: allyRed.data.id,
  parentShip: allyRed,
  damage: 1,
};
handleShipHit(shipA, friendlyProj, [shipA, allyRed, shipC]);
assert.strictEqual(shipA.data.combatTarget, shipC, 'Ship A must NOT switch target to allyRed when hit by friendly fire (benefit of the doubt)');
updateNpcCombat(shipA, 1, 1/60, [shipA, allyRed, shipC]);
assert.strictEqual(shipA.data.combatTarget, shipC, 'Friendly ship must not become combatTarget');

// Also test player ship friendly fire benefit of the doubt
playerShip.data.paint = bluePaint;
const allyBlue = buildShip(null, null, bluePaint);
global.window.currentTargetId = shipC.data.id;
playerShip.data.combatTarget = shipC;
const friendlyPlayerProj = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  shipId: allyBlue.data.id,
  parentShip: allyBlue,
  damage: 1,
};
handleShipHit(playerShip, friendlyPlayerProj, [playerShip, allyBlue, shipC]);
assert.strictEqual(global.window.currentTargetId, shipC.data.id, 'Player tactical target must NOT switch to allyBlue when hit by friendly fire');
assert.strictEqual(playerShip.data.combatTarget, shipC, 'Player combatTarget must remain unchanged on friendly fire');

// Test that different-faction hit STILL triggers retaliatory targeting
const enemyGreen = buildShip(null, null, greenPaint);
const enemyProj = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  shipId: enemyGreen.data.id,
  parentShip: enemyGreen,
  damage: 1,
};
handleShipHit(shipA, enemyProj, [shipA, allyRed, enemyGreen]);
assert.strictEqual(shipA.data.combatTarget, enemyGreen, 'Ship A must retaliate and switch target to enemyGreen (different faction)');

console.log('✓ Retaliatory targeting only applies to ships from different factions; friendly fire given benefit of the doubt');

console.log('--- 7. Testing Destroyed Attacker & Self-Hit Safeguards ---');
// If attacker is destroyed, ship should not switch to it
const deadShip = buildShip();
deadShip.data.isDestroyed = true;
const oldTarget = shipA.data.combatTarget;
const projFromDead = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  container: null,
  vx: 0,
  vy: 0,
  shipId: deadShip.data.id,
  parentShip: deadShip,
  damage: 1,
};
handleShipHit(shipA, projFromDead, [shipA, deadShip]);
assert.strictEqual(shipA.data.combatTarget, oldTarget, 'Must not switch to an already destroyed ship');

// Ship must not target itself
const selfProj = {
  particle: { x: 500, y: 500, rotation: 0 },
  sprite: { x: 500, y: 500, rotation: 0 },
  container: null,
  vx: 0,
  vy: 0,
  shipId: shipA.data.id,
  parentShip: shipA,
  damage: 1,
};
handleShipHit(shipA, selfProj, [shipA]);
assert.strictEqual(shipA.data.combatTarget, oldTarget, 'Must not target self');
console.log('✓ Safeguards prevent targeting destroyed ships or self');

console.log('\nALL RETALIATORY TARGETING TESTS PASSED! 🎯💥');
