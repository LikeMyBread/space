const path = require('path');
const assert = require('assert');
const fs = require('fs');

const mockElement = () => ({
  style: {},
  width: 220,
  height: 140,
  classList: {
    _classes: new Set(),
    add(c) { this._classes.add(c); },
    remove(c) { this._classes.delete(c); },
    contains(c) { return this._classes.has(c); },
    toggle(c, force) {
      if (force !== undefined) {
        if (force) this._classes.add(c);
        else this._classes.delete(c);
        return force;
      }
      if (this._classes.has(c)) {
        this._classes.delete(c);
        return false;
      } else {
        this._classes.add(c);
        return true;
      }
    }
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
  getContext: function() {
    if (!this._ctx) {
      this._ctx = {
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
      };
    }
    return this._ctx;
  },
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
      el.width = 220;
      el.height = 140;
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
    clear() { this.commands = [['clear']]; }
    moveTo(x, y) { this.commands.push(['moveTo', x, y]); }
    lineTo(x, y) { this.commands.push(['lineTo', x, y]); }
    stroke(opts) { this.commands.push(['stroke', opts]); }
    circle(x, y, r) { this.commands.push(['circle', x, y, r]); }
    rect(x, y, w, h) { this.commands.push(['rect', x, y, w, h]); }
    drawRect(x, y, w, h) { this.commands.push(['rect', x, y, w, h]); }
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
      this.alpha = 1;
      this.tint = 0xffffff;
      this.width = 10;
      this.height = 10;
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
    from: () => ({ width: 32, height: 32 }),
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
    organizeFleets,
    getFleetLeader,
    getShipMaxWeaponRange,
    formFleet,
  };
`);

const exported = runCode();
const {
  setup,
  FACTION_PAINTS,
  buildShip,
  organizeFleets,
  getFleetLeader,
  getShipMaxWeaponRange,
} = exported;

setup();
const handleShipHit = global.window.handleShipHit;
const updateNpcCombat = global.window.updateNpcCombat;
const findNearestHostile = global.window.findNearestHostile;

function runTests() {
  console.log("Starting Fleets & Retreat Verification Test Suite...\n");

  const redPaint = FACTION_PAINTS.find(p => p.name === 'Red');
  const bluePaint = FACTION_PAINTS.find(p => p.name === 'Blue');
  const greenPaint = FACTION_PAINTS.find(p => p.name === 'Green');

  // --- Part 1: Player Targeting Exemption ---
  console.log("--- 1. Testing Player Retaliatory Targeting Exemption ---");
  const playerShip = global.window.playerShip;
  const targetA = buildShip(null, null, bluePaint);
  const hostileShooter = buildShip(null, null, greenPaint);

  global.window.currentTargetId = targetA.data.id;
  playerShip.data.combatTarget = targetA;

  const projOnPlayer = {
    particle: { x: 500, y: 500, rotation: 0 },
    sprite: { x: 500, y: 500, rotation: 0 },
    shipId: hostileShooter.data.id,
    parentShip: hostileShooter,
    damage: 1,
  };
  handleShipHit(playerShip, projOnPlayer, [playerShip, targetA, hostileShooter]);

  assert.strictEqual(global.window.currentTargetId, targetA.data.id, 'Player currentTargetId must NOT change when hit by hostile projectile');
  assert.strictEqual(playerShip.data.combatTarget, targetA, 'Player combatTarget must remain targetA');
  console.log("✓ Player targeting is unaffected by incoming hostile projectile hits");

  // --- Part 2: Fleet Organization by Color and Lowest ID ---
  console.log("\n--- 2. Testing Fleet Organization by Color and Lowest ID ---");
  // Create 3 Red ships with known IDs
  const redLeader = buildShip(null, null, redPaint);
  const redFollower1 = buildShip(null, null, redPaint);
  const redFollower2 = buildShip(null, null, redPaint);
  assert(redLeader.data.id < redFollower1.data.id);
  assert(redFollower1.data.id < redFollower2.data.id);

  // Create 2 Blue ships
  const blueLeader = buildShip(null, null, bluePaint);
  const blueFollower = buildShip(null, null, bluePaint);
  assert(blueLeader.data.id < blueFollower.data.id);

  const testFleet = [redFollower2, blueFollower, redLeader, blueLeader, redFollower1];
  organizeFleets(testFleet);

  // Check Red fleet leader
  assert.strictEqual(redLeader.data.isFleetLeader, true, 'Red ship with lowest ID must be fleet leader');
  assert.strictEqual(redLeader.data.formationLeader, null, 'Red leader should have null formationLeader');
  assert.strictEqual(redFollower1.data.formationLeader, redLeader, 'redFollower1 must follow redLeader');
  assert.strictEqual(redFollower2.data.formationLeader, redLeader, 'redFollower2 must follow redLeader');
  assert.strictEqual(redFollower1.data.isFleetLeader, false, 'Follower isFleetLeader must be false');
  assert.strictEqual(redFollower2.data.isFleetLeader, false, 'Follower isFleetLeader must be false');

  // Verify hex grid formation offsets assigned to followers
  assert(redFollower1.data.formationOffset, 'Follower must receive formationOffset');
  assert(redFollower2.data.formationOffset, 'Follower must receive formationOffset');
  assert.notDeepStrictEqual(redFollower1.data.formationOffset, redFollower2.data.formationOffset, 'Followers should have distinct hex grid slots');

  // Check Blue fleet leader
  assert.strictEqual(blueLeader.data.isFleetLeader, true, 'Blue ship with lowest ID must be fleet leader');
  assert.strictEqual(blueFollower.data.formationLeader, blueLeader, 'blueFollower must follow blueLeader');
  console.log("✓ Ships correctly grouped into fleets by color with lowest ID designated as leader and hex slots assigned");

  // --- Part 3: Dynamic Leader Re-Assignment when Leader Destroyed ---
  console.log("\n--- 3. Testing Dynamic Leader Promotion on Leader Loss ---");
  redLeader.data.isDestroyed = true;
  const newRedLeader = getFleetLeader(redFollower1, testFleet);
  assert.strictEqual(newRedLeader, redFollower1, 'Next lowest ID active red ship should become the new leader');

  organizeFleets(testFleet);
  assert.strictEqual(redFollower1.data.isFleetLeader, true, 'redFollower1 promoted to leader');
  assert.strictEqual(redFollower2.data.formationLeader, redFollower1, 'redFollower2 now follows redFollower1');
  console.log("✓ Fleet leadership smoothly transfers to next lowest ID ship when previous leader is destroyed");

  // --- Part 4: Retreat toward Lead Ship ---
  console.log("\n--- 4. Testing Retreat Direction toward Lead Ship ---");
  // Setup green leader and follower
  const greenLeader = buildShip(null, null, greenPaint);
  const greenFollower = buildShip(null, null, greenPaint);
  const enemyShip = buildShip(null, null, redPaint);

  greenLeader.sprite.position.set(200, 200);
  greenLeader.data.vx = 0;
  greenLeader.data.vy = 0;

  // Place follower far away (1500px to the right of leader)
  greenFollower.sprite.position.set(1700, 200);
  greenFollower.sprite.rotation = 0; // facing up (away from leader)
  greenFollower.data.shield = 2.0; // < 25% of 10 -> triggers retreat
  greenFollower.data.maxShield = 10.0;
  greenFollower.data.isRetreating = false;

  const maxWeaponRange = getShipMaxWeaponRange(greenFollower);
  assert.strictEqual(maxWeaponRange, 87.5, 'Standard Light Blaster max weapon range should be 87.5px (lifetime 0.875s * speed 100)');
  const rendezvousThreshold = 2 * maxWeaponRange; // 175px

  const allCombatants = [greenLeader, greenFollower, enemyShip];

  // Run updateNpcCombat for follower
  updateNpcCombat(greenFollower, 1, 1/60, allCombatants);
  assert.strictEqual(greenFollower.data.isRetreating, true, 'Follower must enter retreat state');
  assert.strictEqual(greenFollower.data.aiState, 'RETREAT', 'Follower aiState must be RETREAT');

  // Update multiple ticks to allow follower to turn toward leader at (200, 200)
  for (let t = 0; t < 60; t++) {
    updateNpcCombat(greenFollower, 1, 1/60, allCombatants);
  }

  // Heading toward (200, 200) from (1700, 200) is to the left (-X, rotation ~ -PI/2)
  const angleToLeader = Math.PI / 2 + Math.atan2(0, -1500); // Math.PI / 2 + Math.PI = 3*PI/2 = -PI/2
  const diffAngle = Math.abs(greenFollower.sprite.rotation - (-Math.PI / 2));
  assert(diffAngle < 0.2 || Math.abs(diffAngle - 2 * Math.PI) < 0.2, `Follower should turn toward leader (expected ~-1.57 rad, got ${greenFollower.sprite.rotation})`);
  assert.strictEqual(greenFollower.data.engineLitSprite.visible, true, 'Engines must be lit pushing follower toward leader');
  console.log("✓ Retreating follower correctly steers and thrusts toward lead ship");

  // --- Part 5: Rendezvous within 2x Max Weapon Range and Attack ---
  console.log("\n--- 5. Testing Rendezvous Condition (<= 2x Max Weapon Range) and Re-engagement ---");
  // Move follower to 150px from leader (within 2x weapon range = 175px)
  greenFollower.sprite.position.set(350, 200); // 350 - 200 = 150px <= 175px
  assert.strictEqual(greenFollower.data.isRetreating, true, 'Still in retreat right before update');

  enemyShip.sprite.position.set(900, 400);

  updateNpcCombat(greenFollower, 1, 1/60, allCombatants);

  assert.strictEqual(greenFollower.data.isRetreating, false, 'Follower must exit retreat upon passing within 2x max weapon range (650px <= 700px)');
  assert.strictEqual(greenFollower.data.aiState, 'COMBAT', 'aiState must switch to COMBAT');
  assert.strictEqual(greenFollower.data.combatTarget, enemyShip, 'Follower must target nearest hostile ship upon rendezvous');
  console.log("✓ Follower re-engages, clears retreat, and attacks nearest enemy once within 2x max weapon range of leader");

  console.log("\nALL FLEETS & RETREAT TESTS PASSED SUCCESSFULLY! 🚀🛡️");
}

runTests();
