// Unit and integration tests for halved blaster lifetime (and range) and halved shield regen rate
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Setup DOM and PIXI mocks
global.document = {
  getElementById: (id) => {
    return {
      id,
      textContent: '',
      innerHTML: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false,
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        drawImage: () => {},
        fillText: () => {},
        measureText: () => ({ width: 10 }),
        save: () => {},
        restore: () => {},
        scale: () => {},
        translate: () => {},
      }),
      appendChild: () => {},
      setAttribute: () => {},
      focus: () => {},
      blur: () => {},
      value: '0',
    };
  },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
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
      measureText: () => ({ width: 10 }),
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(400) }),
      putImageData: () => {},
    }),
  }),
};

global.window = {
  innerWidth: 1000,
  innerHeight: 600,
  addEventListener: () => {},
};

class MockContainer {
  constructor() {
    this.children = [];
    this.position = { set: (x, y) => { this.x = x; this.y = y; }, x: 0, y: 0 };
    this.pivot = { set: (x, y) => { this.x = x; this.y = y; }, x: 0, y: 0 };
    this.rotation = 0;
    this.visible = true;
    this.alpha = 1;
  }
  addChild(child) { this.children.push(child); return child; }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }
  destroy() {}
}

class MockSprite extends MockContainer {
  constructor(tex) {
    super();
    this.texture = tex;
    this.tint = 0xffffff;
    this.blendMode = 0;
  }
}

class MockGraphics extends MockContainer {
  clear() { return this; }
  lineStyle() { return this; }
  beginFill() { return this; }
  endFill() { return this; }
  drawCircle() { return this; }
  drawRect() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
}

global.PIXI = {
  Container: MockContainer,
  Sprite: MockSprite,
  Graphics: MockGraphics,
  ParticleContainer: MockContainer,
  Assets: {
    load: async () => {},
    get: () => ({ width: 32, height: 32 }),
  },
  Texture: {
    from: () => ({ width: 32, height: 32 }),
    WHITE: {},
  },
  RenderTexture: {
    create: () => ({}),
  },
  BLEND_MODES: { ADD: 1 },
};

global.performance = { now: () => Date.now() };

const mainJsPath = path.resolve(__dirname, '../main.js');
let code = fs.readFileSync(mainJsPath, 'utf8');

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
    DEFAULT_SHIELD_REGEN_RATE,
    buildShip,
    organizeFleets,
    getFleetLeader,
    getShipMaxWeaponRange,
    formFleet,
  };
`);

const exported = runCode();
const {
  setup,
  WEAPONS_DATA,
  DEFAULT_SHIELD_REGEN_RATE,
  buildShip,
  getShipMaxWeaponRange,
} = exported;

setup();

const playerShip = global.window.playerShip;
const regenerateShields = global.window.regenerateShields;
const getLeadSolution = global.window.getLeadSolution;

console.log("Starting Blaster Lifetime & Shield Regen Test Suite...\n");

// --- 1. Testing Blaster Lifetime and Range ---
console.log("--- 1. Testing Blaster Bolt Lifetime & Calculated Range ---");
const blaster = WEAPONS_DATA.light_blaster;
assert(blaster, "WEAPONS_DATA.light_blaster should exist");
assert.strictEqual(blaster.projectile.lifetime, 0.875, "Blaster projectile lifetime must be 0.875s (cut in half again from 1.75s)");
assert.strictEqual(blaster.projectile.speed, 100, "Blaster projectile speed should remain 100 px/s");

const blasterRange = blaster.projectile.speed * blaster.projectile.lifetime;
assert.strictEqual(blasterRange, 87.5, "Blaster range must be 87.5px (cut in half again from 175px)");
console.log(`✓ Blaster lifetime is ${blaster.projectile.lifetime}s and effective range is ${blasterRange}px`);

// --- 2. Testing getShipMaxWeaponRange ---
console.log("\n--- 2. Testing getShipMaxWeaponRange ---");
const testShip = buildShip();
const maxWeaponRange = getShipMaxWeaponRange(testShip);
assert.strictEqual(maxWeaponRange, 87.5, "getShipMaxWeaponRange for standard ship must return 87.5px");

const fallbackRange = getShipMaxWeaponRange(null);
assert.strictEqual(fallbackRange, 87.5, "getShipMaxWeaponRange fallback for null ship must return 87.5px");
console.log(`✓ getShipMaxWeaponRange returns ${maxWeaponRange}px for ships equipped with light blaster`);

// --- 3. Testing Lead Solution and Weapon Firing Range Envelope ---
console.log("\n--- 3. Testing Lead Solution Range Envelope ---");
const shooter = buildShip();
shooter.sprite.position.set(500, 500);
shooter.data.vx = 0;
shooter.data.vy = 0;

// Target at 75px away: should be IN RANGE (75 <= 87.5 * 1.15 = 100.625)
const targetInRange = buildShip();
targetInRange.sprite.position.set(500, 425); // 75px distance
targetInRange.data.vx = 0;
targetInRange.data.vy = 0;

const solInRange = getLeadSolution(shooter, targetInRange);
assert.strictEqual(solInRange.inRange, true, "Target at 75px must be in range");

// Target at 150px away: should be OUT OF RANGE (150 > 100.625)
const targetOutOfRange = buildShip();
targetOutOfRange.sprite.position.set(500, 350); // 150px distance
targetOutOfRange.data.vx = 0;
targetOutOfRange.data.vy = 0;

const solOutOfRange = getLeadSolution(shooter, targetOutOfRange);
assert.strictEqual(solOutOfRange.inRange, false, "Target at 150px must be out of range");
console.log("✓ Target at 75px is in range; target at 150px is correctly out of range");

// --- 4. Testing Default Shield Regen Rate Constant and Ship Data ---
console.log("\n--- 4. Testing Default Shield Regen Rate ---");
assert.strictEqual(DEFAULT_SHIELD_REGEN_RATE, 0.5, "DEFAULT_SHIELD_REGEN_RATE constant must be 0.5 (halved from 1.0)");
assert.strictEqual(global.window.DEFAULT_SHIELD_REGEN_RATE, 0.5, "window.DEFAULT_SHIELD_REGEN_RATE must be 0.5");

const newShip = buildShip();
assert.strictEqual(newShip.data.shieldRegenRate, 0.5, "New ship data shieldRegenRate must default to 0.5");
console.log("✓ DEFAULT_SHIELD_REGEN_RATE is 0.5 and applied to ship data on buildShip");

// --- 5. Testing regenerateShields Logic ---
console.log("\n--- 5. Testing regenerateShields Execution ---");
// Set up ship with 0 shields and 0 shieldDownDelay
newShip.data.shield = 0;
newShip.data.maxShield = 10;
newShip.data.shieldDownDelay = 0;
newShip.data.isDestroyed = false;
newShip.data.isDisabled = false;

// Register newShip in ships list
global.window.ships.push(newShip);

// Simulate 1.0 second of time
regenerateShields(1.0);
assert(Math.abs(newShip.data.shield - 0.5) < 0.001, `After 1s, shield should be 0.5 (got ${newShip.data.shield})`);

// Simulate another 2.0 seconds of time
regenerateShields(2.0);
assert(Math.abs(newShip.data.shield - 1.5) < 0.001, `After 2 more seconds, shield should be 1.5 (got ${newShip.data.shield})`);

// Verify delay after shields drop
newShip.data.shieldDownDelay = 1.0;
regenerateShields(0.5);
assert(Math.abs(newShip.data.shield - 1.5) < 0.001, "Shield should not regenerate while shieldDownDelay > 0");
assert(Math.abs(newShip.data.shieldDownDelay - 0.5) < 0.001, `shieldDownDelay should tick down to 0.5 (got ${newShip.data.shieldDownDelay})`);

regenerateShields(0.5); // shieldDownDelay expires to 0
assert(Math.abs(newShip.data.shield - 1.5) < 0.001, "Shield does not recharge on exact tick delay reaches 0");

regenerateShields(1.0); // Now recharges
assert(Math.abs(newShip.data.shield - 2.0) < 0.001, `Shield recharges after delay expires (got ${newShip.data.shield})`);

// Verify shield caps at maxShield
newShip.data.shield = 9.8;
regenerateShields(1.0);
assert.strictEqual(newShip.data.shield, 10, "Shield must cap at maxShield (10)");

// Verify disabled ships do not regenerate shields
newShip.data.isDisabled = true;
newShip.data.shield = 0;
regenerateShields(2.0);
assert.strictEqual(newShip.data.shield, 0, "Disabled ship must not regenerate shields");

// Clean up
const idx = global.window.ships.indexOf(newShip);
if (idx !== -1) global.window.ships.splice(idx, 1);

console.log("✓ regenerateShields regenerates at 0.5 pt/s, respects delay, caps at maxShield, and ignores disabled ships");

console.log("\nALL BLASTER LIFETIME & SHIELD REGEN TESTS PASSED! 🚀🛡️⚡");
