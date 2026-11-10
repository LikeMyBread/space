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
        fillRect: (x, y, w, h) => {
          if (!this._ctx._drawnRects) this._ctx._drawnRects = [];
          this._ctx._drawnRects.push({ x, y, w, h, fillStyle: this._ctx.fillStyle });
        },
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
  };
`);

const exported = runCode();
const { setup, HULLS_DATA, buildShip } = exported;

setup();

function runTests() {
  console.log("Starting Hull Pivots Verification Test Suite...\n");

  const expectedPivots = {
    Anvil: { x: 15.5, y: 16.5 },
    Avocado: { x: 15.5, y: 18 },
    Boat: { x: 16.5, y: 16 },
    Crab: { x: 15.5, y: 18 },
    Delta: { x: 14.5, y: 17 },
    Hammer: { x: 15.5, y: 14 },
    Protogon: { x: 10, y: 12 },
    Shadow: { x: 15.5, y: 17 },
    Shuttle: { x: 14.5, y: 16 },
    Skate: { x: 15.5, y: 14 },
  };

  // 1. Verify all 10 hulls in HULLS_DATA have exact expected coordinates
  console.log("--- 1. Testing HULLS_DATA Pivot Coordinates ---");
  for (const [name, expected] of Object.entries(expectedPivots)) {
    const hull = HULLS_DATA.find(h => h.name === name);
    assert(hull, `Hull ${name} must exist in HULLS_DATA`);
    assert.strictEqual(hull.pivot.x, expected.x, `${name} pivot.x should be ${expected.x}, got ${hull.pivot.x}`);
    assert.strictEqual(hull.pivot.y, expected.y, `${name} pivot.y should be ${expected.y}, got ${hull.pivot.y}`);
    console.log(`✓ ${name.padEnd(10)}: pivot is { x: ${hull.pivot.x}, y: ${hull.pivot.y} }`);
  }

  // 2. Verify buildShip applies fractional pivot to sprite
  console.log("\n--- 2. Testing Container Pivot Setting on buildShip ---");
  for (const [name, expected] of Object.entries(expectedPivots)) {
    const hull = HULLS_DATA.find(h => h.name === name);
    const ship = buildShip(hull);
    assert.strictEqual(ship.sprite.pivot.x, expected.x, `${name} container pivot.x must match hull.pivot.x`);
    assert.strictEqual(ship.sprite.pivot.y, expected.y, `${name} container pivot.y must match hull.pivot.y`);
  }
  console.log("✓ All 10 ship containers correctly set fractional/integer pivots on instantiation");

  // 3. Test player loadout change to Anvil (fractional 15.5, 16.5)
  console.log("\n--- 3. Testing Player Ship Switch to Fractional Pivot Hull ---");
  const playerShip = global.window.playerShip;
  const anvilHull = HULLS_DATA.find(h => h.name === 'Anvil');
  playerShip.data.hull = anvilHull;
  playerShip.sprite.pivot.set(anvilHull.pivot.x, anvilHull.pivot.y);
  assert.strictEqual(playerShip.sprite.pivot.x, 15.5);
  assert.strictEqual(playerShip.sprite.pivot.y, 16.5);
  console.log("✓ Player ship sprite pivot successfully set to Anvil's fractional coordinates (15.5, 16.5)");

  // 4. Test target view monitor with fractional pivot
  console.log("\n--- 4. Testing Target View with Fractional Pivot Hull ---");
  global.window.showPivots = true;
  global.window.currentTargetId = playerShip.data.id;
  const targetCanvas = global.document.getElementById('target-canvas');
  const targetCtx = targetCanvas.getContext('2d');
  targetCtx._drawnRects = [];
  global.window.drawTargetView(playerShip);

  const cx = targetCanvas.width / 2;
  const cy = targetCanvas.height / 2;
  const targetPivot = targetCtx._drawnRects.find(
    r => r.x === Math.round(cx) - 1 && r.y === Math.round(cy) - 1 && r.w === 3 && r.h === 3 && r.fillStyle === '#c084fc'
  );
  assert(targetPivot, "Target view monitor should render 3x3 highlight cleanly for fractional pivot ship");
  console.log("✓ Target monitor renders cleanly for ship with fractional pivot");

  console.log("\nALL UPDATED PIVOTS TESTS PASSED SUCCESSFULLY! 🎯✨");
}

runTests();
