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
const { setup } = exported;

setup();

function runTests() {
  console.log("Starting Pivot Overlay Test Suite...");

  // 1. Verify index.html contains pivot button and styling
  const htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  assert(htmlContent.includes('id="pivot-btn"'), "index.html must include id='pivot-btn'");
  assert(htmlContent.includes('.btn-pivot'), "index.html must include .btn-pivot css");
  assert(htmlContent.includes('Pivots: OFF'), "index.html must have initial text Pivots: OFF");
  console.log("✓ index.html structure verified");

  const pivotBtn = global.document.getElementById('pivot-btn');
  assert(pivotBtn, "pivot-btn element should exist in DOM");

  // 2. Verify initial state
  assert.strictEqual(global.window.showPivots, false, "showPivots should initially be false");
  assert.strictEqual(global.window.pivotGraphics != null, true, "pivotGraphics should be defined");
  console.log("✓ Initial state verified");

  // 3. Test button click toggles state
  pivotBtn.click();
  assert.strictEqual(global.window.showPivots, true, "Clicking pivotBtn should toggle showPivots to true");
  assert.strictEqual(pivotBtn.textContent, "Pivots: ON", "Button text should be Pivots: ON");
  assert.strictEqual(pivotBtn.classList.contains("active"), true, "Button should have .active class");

  pivotBtn.click();
  assert.strictEqual(global.window.showPivots, false, "Second click should toggle showPivots to false");
  assert.strictEqual(pivotBtn.textContent, "Pivots: OFF", "Button text should be Pivots: OFF");
  assert.strictEqual(pivotBtn.classList.contains("active"), false, "Button should not have .active class");
  console.log("✓ Button click toggle verified");

  // 4. Test window.showPivots setter
  global.window.showPivots = true;
  assert.strictEqual(pivotBtn.textContent, "Pivots: ON");
  assert.strictEqual(pivotBtn.classList.contains("active"), true);

  // 5. Test updatePivotGraphics drawing
  const pShip = global.window.playerShip;
  assert(pShip, "playerShip should exist");
  pShip.sprite.x = 250.4;
  pShip.sprite.y = 180.6;

  global.window.updatePivotGraphics();
  const cmds = global.window.pivotGraphics.commands;
  assert(cmds.some(c => c[0] === 'clear'), "pivotGraphics should call clear");
  
  // Verify rect coordinates match Math.round(s.sprite.x) - PIVOT_HALF, Math.round(s.sprite.y) - PIVOT_HALF, PIVOT_SIZE, PIVOT_SIZE
  const rects = cmds.filter(c => c[0] === 'rect');
  assert(rects.length > 0, "pivotGraphics should draw rects for onscreen ships");
  assert.strictEqual(global.window.PIVOT_SIZE, 3, "PIVOT_SIZE should be 3");
  const playerRect = rects.find(c => c[1] === 249 && c[2] === 180 && c[3] === 3 && c[4] === 3);
  assert(playerRect, `Expected 3x3 rect at (249, 180, 3, 3), got ${JSON.stringify(rects)}`);

  // Verify fill color is bright purple 0xc084fc
  const fills = cmds.filter(c => c[0] === 'fill');
  assert(fills.length > 0, "pivotGraphics should call fill");
  assert.strictEqual(fills[0][1].color, 0xc084fc, "fill color should be 0xc084fc (bright purple)");
  assert.strictEqual(fills[0][1].alpha, 1.0, "fill alpha should be 1.0");
  console.log("✓ Drawing bright purple expanded 3x3 highlight centered at pivot verified");

  // 6. Offscreen culling test
  pShip.sprite.x = -50;
  pShip.sprite.y = 300;
  global.window.updatePivotGraphics();
  const offscreenRects = global.window.pivotGraphics.commands.filter(c => c[0] === 'rect');
  const foundCulled = offscreenRects.find(c => c[1] === -50);
  assert(!foundCulled, "Offscreen ship should be culled from pivot rendering");
  console.log("✓ Offscreen pivot culling verified");

  // Reset playerShip position
  pShip.sprite.x = 300;
  pShip.sprite.y = 300;

  // 7. Destroyed ship test
  pShip.data.isDestroyed = true;
  global.window.updatePivotGraphics();
  const destroyedRects = global.window.pivotGraphics.commands.filter(c => c[0] === 'rect');
  const foundDestroyed = destroyedRects.find(c => c[1] === 300 && c[2] === 300);
  assert(!foundDestroyed, "Destroyed ship should not have pivot drawn");
  pShip.data.isDestroyed = false;
  console.log("✓ Destroyed ship exclusion verified");

  // 8. Clearing when showPivots is false
  global.window.showPivots = false;
  const clearedCmds = global.window.pivotGraphics.commands;
  const nonClearCmds = clearedCmds.filter(c => c[0] !== 'clear');
  assert.strictEqual(nonClearCmds.length, 0, "No drawing commands should run when showPivots is false");
  console.log("✓ Pivot graphics clearing when disabled verified");

  // 9. Target camera monitor pivot drawing test
  const targetCanvas = global.document.getElementById('target-canvas');
  const targetCtx = targetCanvas.getContext('2d');
  targetCtx._drawnRects = [];

  // Enable showPivots
  global.window.showPivots = true;
  // Pick an active target
  const targetShip = global.window.ships[0] || pShip;
  global.window.currentTargetId = targetShip.data.id;
  global.window.drawTargetView(targetShip);

  const monitorRects = targetCtx._drawnRects || [];
  const cx = targetCanvas.width / 2;
  const cy = targetCanvas.height / 2;
  const targetPivotPixel = monitorRects.find(r => r.x === Math.round(cx) - 1 && r.y === Math.round(cy) - 1 && r.w === 3 && r.h === 3 && r.fillStyle === '#c084fc');
  assert(targetPivotPixel, `Target monitor should draw 3x3 purple highlight at center (${cx}, ${cy})`);
  console.log("✓ Target monitor 3x3 pivot highlight rendering verified");

  // When showPivots is false, no pivot pixel drawn on monitor
  targetCtx._drawnRects = [];
  global.window.showPivots = false;
  global.window.drawTargetView(targetShip);
  const monitorRectsOff = targetCtx._drawnRects || [];
  const pivotPixelOff = monitorRectsOff.find(r => r.x === Math.round(cx) - 1 && r.y === Math.round(cy) - 1 && r.fillStyle === '#c084fc');
  assert(!pivotPixelOff, "Target monitor should not draw pivot highlight when showPivots is false");
  console.log("✓ Target monitor pivot highlight omission when disabled verified");

  // 10. Test gameLoop updates pivot graphics
  global.window.showPivots = true;
  global.window.pivotGraphics.commands = [];
  global.window.gameLoop(1);
  const loopCmds = global.window.pivotGraphics.commands;
  assert(loopCmds.some(c => c[0] === 'clear'), "gameLoop should trigger updatePivotGraphics");
  assert(loopCmds.some(c => c[0] === 'rect'), "gameLoop should render pivot rects");
  console.log("✓ gameLoop integration verified");

  console.log("\nALL PIVOT OVERLAY TESTS PASSED SUCCESSFULLY!");
}

runTests();
