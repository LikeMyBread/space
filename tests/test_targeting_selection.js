const path = require('path');
const assert = require('assert');
const fs = require('fs');

console.log('--- Testing New Targeting Selection Modes ---');

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
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
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
  width: 1000,
  height: 600,
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
function dispatchWindowKeydown(evt) {
  let prevented = false;
  const event = {
    ...evt,
    target: { tagName: 'BODY' },
    preventDefault: () => { prevented = true; },
  };
  if (windowListeners['keydown']) {
    for (const fn of windowListeners['keydown']) {
      fn(event);
    }
  }
  return { prevented };
}

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
    }
    clear() {}
    circle() {}
    fill() {}
    stroke() {}
    moveTo() {}
    lineTo() {}
    destroy() {}
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
    get: () => ({ width: 30, height: 30 }),
  },
  Texture: {
    from: () => ({ width: 30, height: 30 }),
    WHITE: { width: 3, height: 3 },
  },
};

let code = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf-8');
code = code.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 30, height: 30 }) });');
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
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    WEAPONS_DATA,
    buildShip,
    getRegisteredTicker: () => registeredTickerFn
  };
`);

const exp = runCode();
exp.setup();

const { FACTION_PAINTS, buildShip } = exp;
const playerShip = global.window.playerShip;
const ships = global.window.ships;
const derelictShip = global.window.derelictShip;
const radarCanvas = domMap.get('radar-canvas');
radarCanvas.width = 220;
radarCanvas.height = 200;
radarCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 220, height: 200 });

// Empty any default ships for clean testing
ships.length = 0;

console.log('1. Testing X key nearest hostile selection...');
// Player paint is FACTION_PAINTS[0] (Crimson Vanguard)
playerShip.data.paint = FACTION_PAINTS[0];
playerShip.sprite.position.set(500, 300);

// Friendly ship (same faction paint) close to player at distance 50px
const friendlyShip = buildShip(null, null, FACTION_PAINTS[0]);
friendlyShip.sprite.position.set(500, 350);
ships.push(friendlyShip);

// Hostile ship 1 (Blue) at distance 150px
const hostile1 = buildShip(null, null, FACTION_PAINTS[1]);
hostile1.sprite.position.set(500, 450);
ships.push(hostile1);

// Hostile ship 2 (Green) at distance 300px
const hostile2 = buildShip(null, null, FACTION_PAINTS[2]);
hostile2.sprite.position.set(500, 600);
ships.push(hostile2);

// Derelict ship (neutral, yellow) at distance 30px
derelictShip.sprite.position.set(500, 330);

// Set current target to friendly ship initially
global.window.getCurrentTarget();
assert.strictEqual(global.window.getCurrentTarget().data.id, derelictShip.data.id, 'Initially starts on derelict or first ship');

// Press X key
const keyRes = dispatchWindowKeydown({ code: 'KeyX', key: 'x', keyCode: 88 });
assert(keyRes.prevented, 'KeyX event should prevent default');
assert.strictEqual(global.window.getCurrentTarget().data.id, hostile1.data.id, 'X key must select nearest HOSTILE ship (hostile1 at 150px), ignoring closer friendly and neutral derelict');
console.log('✓ X key correctly selects nearest hostile ship and ignores friendlies & derelict');

// Move hostile2 closer than hostile1
hostile2.sprite.position.set(500, 380); // distance 80px
dispatchWindowKeydown({ code: 'KeyX', key: 'X', keyCode: 88 });
assert.strictEqual(global.window.getCurrentTarget().data.id, hostile2.data.id, 'X key updates to hostile2 now that it is closer (80px vs 150px)');
console.log('✓ X key dynamically picks closest hostile when positions change');

console.log('2. Testing Main Screen click targeting...');
// Clicking on stage near hostile1 (500, 450)
global.app.canvas.click({ clientX: 510, clientY: 455 });
assert.strictEqual(global.window.getCurrentTarget().data.id, hostile1.data.id, 'Clicking near (500, 450) must target hostile1');

// Clicking near friendlyShip (500, 350)
global.app.canvas.click({ clientX: 495, clientY: 345 });
assert.strictEqual(global.window.getCurrentTarget().data.id, friendlyShip.data.id, 'Clicking near (500, 350) must target friendlyShip');

// Clicking near derelictShip (500, 330)
global.app.canvas.click({ clientX: 502, clientY: 332 });
assert.strictEqual(global.window.getCurrentTarget().data.id, derelictShip.data.id, 'Clicking near (500, 330) must target derelictShip');
console.log('✓ Main screen clicks select closest targetable ship (friendly, hostile, or derelict)');

console.log('3. Testing Radar Screen click targeting...');
// Calculate radar dot positions for hostile1 and friendlyShip
const dotFriendly = global.window.getRadarDotPosition(friendlyShip, playerShip);
const dotHostile1 = global.window.getRadarDotPosition(hostile1, playerShip);
const dotHostile2 = global.window.getRadarDotPosition(hostile2, playerShip);
const dotDerelict = global.window.getRadarDotPosition(derelictShip, playerShip);

assert(dotFriendly, 'Friendly ship must have radar position');
assert(dotHostile1, 'Hostile1 must have radar position');

// Click on radar canvas right at dotHostile1's position
radarCanvas.click({ clientX: dotHostile1.rx, clientY: dotHostile1.ry });
assert.strictEqual(global.window.getCurrentTarget().data.id, hostile1.data.id, 'Clicking on hostile1 dot must target hostile1');

// Click on radar canvas right at dotFriendly's position
radarCanvas.click({ clientX: dotFriendly.rx, clientY: dotFriendly.ry });
assert.strictEqual(global.window.getCurrentTarget().data.id, friendlyShip.data.id, 'Clicking on friendly dot must target friendlyShip');

// Click on radar canvas right at dotDerelict's position
radarCanvas.click({ clientX: dotDerelict.rx, clientY: dotDerelict.ry });
assert.strictEqual(global.window.getCurrentTarget().data.id, derelictShip.data.id, 'Clicking on derelict dot must target derelictShip');
console.log('✓ Radar screen clicks select ship whose dot is closest to click location');

console.log('4. Testing Destroyed ship exclusion...');
hostile1.data.isDestroyed = true;
// Click near hostile1: should select the next closest non-destroyed ship
global.app.canvas.click({ clientX: 500, clientY: 450 });
assert.notStrictEqual(global.window.getCurrentTarget().data.id, hostile1.data.id, 'Destroyed ship cannot be targeted');
console.log('✓ Destroyed ships are properly excluded from selection');

console.log('\nALL TARGETING SELECTION TESTS PASSED SUCCESSFULLY! 🎯');
