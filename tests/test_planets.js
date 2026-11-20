const path = require('path');
const assert = require('assert');
const fs = require('fs');

console.log('--- Testing Planets System & Radar Selection ---');

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
  click(evt = {}) {
    if (this._listeners['click']) {
      for (const fn of this._listeners['click']) {
        fn({
          target: this,
          clientX: evt.clientX || 0,
          clientY: evt.clientY || 0,
          offsetX: evt.offsetX,
          offsetY: evt.offsetY,
          x: evt.x,
          y: evt.y,
          ...evt,
        });
      }
    }
  },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 220, height: 200 }),
  appendChild: () => {},
  getContext: function() {
    if (this._ctx) return this._ctx;
    const operations = [];
    this._ctx = {
      _operations: operations,
      clearRect: () => operations.push({ op: 'clearRect' }),
      fillRect: () => operations.push({ op: 'fillRect' }),
      beginPath: () => operations.push({ op: 'beginPath' }),
      arc: (x, y, r, sa, ea) => operations.push({ op: 'arc', x, y, r, sa, ea }),
      rect: (x, y, w, h) => operations.push({ op: 'rect', x, y, w, h }),
      strokeRect: (x, y, w, h) => operations.push({ op: 'strokeRect', x, y, w, h }),
      clip: () => operations.push({ op: 'clip' }),
      stroke: function() { operations.push({ op: 'stroke', strokeStyle: this.strokeStyle, lineWidth: this.lineWidth }); },
      fill: function() { operations.push({ op: 'fill', fillStyle: this.fillStyle }); },
      moveTo: (x, y) => operations.push({ op: 'moveTo', x, y }),
      lineTo: (x, y) => operations.push({ op: 'lineTo', x, y }),
      fillText: (t, x, y) => operations.push({ op: 'fillText', text: t, x, y }),
      save: () => operations.push({ op: 'save' }),
      restore: () => operations.push({ op: 'restore' }),
      translate: (x, y) => operations.push({ op: 'translate', x, y }),
      rotate: (a) => operations.push({ op: 'rotate', a }),
      scale: (sx, sy) => operations.push({ op: 'scale', sx, sy }),
      drawImage: (img, ...args) => operations.push({ op: 'drawImage', img, args }),
      setLineDash: (d) => operations.push({ op: 'setLineDash', d }),
      getImageData: () => ({ data: new Uint8ClampedArray(400) }),
      putImageData: () => {},
      strokeStyle: '#ffffff',
      fillStyle: '#ffffff',
      lineWidth: 1,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
    };
    return this._ctx;
  },
  textContent: '',
  className: '',
  value: '',
  blur: () => {},
  width: 220,
  height: 200,
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
      el.width = 1000;
      el.height = 600;
    }
    return el;
  },
  body: mockElement(),
};

const windowListeners = {};
global.window = {
  addEventListener: (event, fn) => {
    if (!windowListeners[event]) windowListeners[event] = [];
    windowListeners[event].push(fn);
  },
};

global.performance = { now: () => 1000 };

global.PIXI = {
  Application: class {
    async init() {
      this.canvas = mockElement();
      this.canvas.width = 1000;
      this.canvas.height = 600;
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
    destroy() { this.destroyed = true; }
  },
  Graphics: class {
    constructor() {
      this.position = { set: () => {}, x: 0, y: 0 };
      this.pivot = { set: () => {}, x: 0, y: 0 };
      this.rotation = 0;
      this.visible = true;
      this.ops = [];
    }
    clear() { this.ops.push({ op: 'clear' }); }
    circle(x, y, r) { this.ops.push({ op: 'circle', x, y, r }); }
    fill(style) { this.ops.push({ op: 'fill', style }); }
    stroke(style) { this.ops.push({ op: 'stroke', style }); }
    moveTo(x, y) { this.ops.push({ op: 'moveTo', x, y }); }
    lineTo(x, y) { this.ops.push({ op: 'lineTo', x, y }); }
    destroy() { this.destroyed = true; }
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
  Assets: {
    get: () => ({ width: 200, height: 200 }),
  },
  Texture: {
    from: () => ({ width: 200, height: 200 }),
    WHITE: { width: 3, height: 3 },
  },
};

let code = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf-8');
code = code.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 200, height: 200 }) });');
code = code.replace('let app;', 'var app = global.app;');
code = code.replace(/init\(\)\.catch[\s\S]*$/, '');

let registeredTickerFn = null;
global.app = {
  canvas: mockElement(),
  stage: new PIXI.Container(),
  ticker: {
    add: (fn) => { registeredTickerFn = fn; },
    FPS: 60,
  }
};
global.app.canvas.width = 1000;
global.app.canvas.height = 600;

const runCode = new Function(`
  ${code}
  return {
    setup,
    ASSET_PATHS,
    PLANETS_DATA,
    buildShip,
    FACTION_PAINTS,
  };
`);

const exp = runCode();
const { setup, ASSET_PATHS, PLANETS_DATA } = exp;

console.log('1. Verifying Planet Assets & Data Definitions...');
assert(ASSET_PATHS.includes('img/planets/Sugar.png'), 'ASSET_PATHS must include Sugar.png');
assert(ASSET_PATHS.includes('img/planets/Pepper.png'), 'ASSET_PATHS must include Pepper.png');
assert(ASSET_PATHS.includes('img/planets/Pepper2.png'), 'ASSET_PATHS must include Pepper2.png');
assert(Array.isArray(PLANETS_DATA) && PLANETS_DATA.length >= 3, 'PLANETS_DATA must have at least 3 planets');

const planetNames = PLANETS_DATA.map(p => p.name);
assert(planetNames.includes('Sugar'), 'PLANETS_DATA must define Sugar');
assert(planetNames.includes('Pepper'), 'PLANETS_DATA must define Pepper');
console.log('✓ ASSET_PATHS and PLANETS_DATA correctly configured');

console.log('2. Verifying setup() spawns planets in system...');
setup();

const planets = global.window.planets;
assert(Array.isArray(planets) && planets.length === 3, 'global.window.planets must contain 3 planet objects');

for (const p of planets) {
  assert(p.sprite, 'Planet must have a sprite');
  assert(p.data && p.data.isPlanet === true, 'Planet data.isPlanet must be true');
  assert.strictEqual(typeof p.data.id, 'number', 'Planet must have a numeric id');
  assert.strictEqual(p.data.radius, 100, 'Planet radius should be 100 (for 200x200 sprite)');
  assert.strictEqual(p.sprite.pivot.x, 100, 'Planet sprite pivot.x must be 100 (centered)');
  assert.strictEqual(p.sprite.pivot.y, 100, 'Planet sprite pivot.y must be 100 (centered)');
}
console.log('✓ Planets properly spawned with centered pivots and planet metadata');

console.log('3. Verifying Radar rendering of planets as hollow yellow circles...');
const radarCanvas = domMap.get('radar-canvas');
radarCanvas.width = 220;
radarCanvas.height = 200;
const radarCtx = radarCanvas.getContext('2d');
const playerShip = global.window.playerShip;

// Clear operations log and call drawRadar
radarCtx._operations.length = 0;
global.window.drawRadar(1);

// Find operations corresponding to planets (arcs with radius 7.5 and stroke with #facc15)
const yellowStrokes = radarCtx._operations.filter(op => op.op === 'stroke' && (op.strokeStyle === '#facc15' || op.strokeStyle.toLowerCase().includes('yellow')));
assert(yellowStrokes.length >= 3, `Expected at least 3 yellow stroke calls for planets, found ${yellowStrokes.length}`);

const planetArcs = radarCtx._operations.filter(op => op.op === 'arc' && op.r >= 7 && op.r <= 8.5);
assert(planetArcs.length >= 3, `Expected at least 3 planet circle arcs (radius ~7.5), found ${planetArcs.length}`);

// Ensure planet circles are hollow (no fill right after planet arc)
for (let i = 0; i < radarCtx._operations.length; i++) {
  const op = radarCtx._operations[i];
  if (op.op === 'arc' && op.r >= 7 && op.r <= 8.5) {
    const nextOp = radarCtx._operations[i + 1];
    assert.strictEqual(nextOp.op, 'stroke', 'Planet circle must be stroked (hollow), not filled');
  }
}
console.log('✓ Planets render on radar as hollow yellow circles noticeably larger than ship dots (r=7.5 vs 2.5-3.5)');

console.log('4. Verifying radar click selection of planet as target/destination...');
radarCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 220, height: 200 });

const sugarPlanet = planets.find(p => p.data.name === 'Sugar');
assert(sugarPlanet, 'Sugar planet must exist');

const sugarDot = global.window.getRadarDotPosition(sugarPlanet, playerShip);
assert(sugarDot, 'getRadarDotPosition must return coordinates for Sugar');

// Click on radar canvas directly at Sugar's dot
radarCanvas.click({ clientX: sugarDot.rx, clientY: sugarDot.ry });

const currentTarget = global.window.getCurrentTarget();
assert.strictEqual(currentTarget.data.id, sugarPlanet.data.id, 'Clicking on Sugar radar position must select Sugar as target/destination');
console.log('✓ Clicking radar blip selects planet destination as current target');

console.log('5. Verifying Target Monitor & HTML panel for planet destination...');
const targetStateEl = domMap.get('target-state-val');
const targetFactionEl = domMap.get('target-faction-val');
const targetHullEl = domMap.get('target-hull-val');
const targetShieldEl = domMap.get('target-shield-val');
const targetArmorEl = domMap.get('target-armor-val');
const targetDistEl = domMap.get('target-dist-val');

const targetCanvas = domMap.get('target-canvas');
targetCanvas.width = 220;
targetCanvas.height = 170;
const targetCtx = targetCanvas.getContext('2d');
targetCtx._operations.length = 0;

global.window.drawTargetView();

assert.strictEqual(targetStateEl.textContent, 'DESTINATION', 'Target state must display DESTINATION');
assert.strictEqual(targetFactionEl.textContent, 'Celestial Body', 'Target affiliation must display Celestial Body');
assert.strictEqual(targetHullEl.textContent, 'Sugar', 'Target name must display Sugar');
assert.strictEqual(targetShieldEl.textContent, '--', 'Planet shields must display --');
assert.strictEqual(targetArmorEl.textContent, '--', 'Planet armor must display --');
assert(targetDistEl.textContent.includes('m'), 'Planet distance must be displayed in meters');

// Verify Target Monitor OSD text
const osdTexts = targetCtx._operations.filter(op => op.op === 'fillText').map(op => op.text);
assert(osdTexts.some(t => t.includes('TRK: DESTINATION')), 'Target OSD must include TRK: DESTINATION');
assert(osdTexts.some(t => t.includes('CLASS: PLANET')), 'Target OSD must include CLASS: PLANET');
assert(osdTexts.some(t => t.includes('RNG:')), 'Target OSD must include range');
assert(osdTexts.some(t => t.includes('BRG:')), 'Target OSD must include bearing');
console.log('✓ Target Monitor and HUD panel correctly display planet destination vitals');

console.log('6. Verifying Tactical Brackets on Radar and Main Stage for selected planet...');
radarCtx._operations.length = 0;
global.window.drawRadar(1);

// When targeted, radar should draw targeting bracket around planet (b = 11)
const bracketStrokes = radarCtx._operations.filter(op => op.op === 'stroke' && op.strokeStyle === '#38bdf8' && op.lineWidth === 2);
assert(bracketStrokes.length > 0, 'Radar must draw tactical bracket around selected planet destination');

// Verify main stage target brackets
const graphicsObjects = global.app.stage.children.filter(c => c instanceof PIXI.Graphics);
// shieldGraphics is [0], targetBracketGraphics is [1]
const targetBracketGraphics = graphicsObjects[1] || graphicsObjects.find(g => g.ops.some(op => op.op === 'stroke' && op.style && op.style.color));
if (targetBracketGraphics) {
  // Move planet within viewport to test bracket drawing
  sugarPlanet.sprite.x = 400;
  sugarPlanet.sprite.y = 300;
  targetBracketGraphics.ops.length = 0;
  // Trigger target bracket update
  registeredTickerFn(1);
  const strokeOps = targetBracketGraphics.ops.filter(op => op.op === 'stroke');
  assert(strokeOps.length > 0, 'Target brackets must be drawn on main canvas for targeted planet');
}
console.log('✓ Tactical brackets rendered on radar and main viewport for selected destination');

console.log('7. Verifying Planet motion relative to player velocity in gameLoop...');
const pepperPlanet = planets.find(p => p.data.name === 'Pepper');
const initialPepX = pepperPlanet.sprite.x;
const initialPepY = pepperPlanet.sprite.y;

playerShip.data.vx = 100; // Moving right at 100 px/s
playerShip.data.vy = 50;  // Moving down at 50 px/s

registeredTickerFn(16.667); // 1 frame (~1/60s)

const expectedDeltaX = 100 * 16.667 * (60 / 1000);
const expectedDeltaY = 50 * 16.667 * (60 / 1000);

assert(Math.abs((initialPepX - pepperPlanet.sprite.x) - expectedDeltaX) < 0.1, 'Planet X must shift opposite to player vx');
assert(Math.abs((initialPepY - pepperPlanet.sprite.y) - expectedDeltaY) < 0.1, 'Planet Y must shift opposite to player vy');
console.log('✓ Planets move relative to player at correct physical velocity');

console.log('8. Verifying cycleTarget cycles through both ships and planets...');
const allTargets = global.window.getAllTargets();
assert(allTargets.length >= planets.length + 1, 'getAllTargets must include ships and planets');

const visitedIds = new Set();
for (let i = 0; i < allTargets.length; i++) {
  const t = global.window.getCurrentTarget();
  visitedIds.add(t.data.id);
  global.window.cycleTarget();
}
assert.strictEqual(visitedIds.size, allTargets.length, 'cycleTarget must visit all targets including planets');
console.log('✓ cycleTarget seamlessly cycles through ships and planet destinations');

console.log('\nALL PLANET TESTS PASSED SUCCESSFULLY! 🪐✨');
