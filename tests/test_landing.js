const path = require('path');
const assert = require('assert');
const fs = require('fs');

console.log('--- Testing Planet Landing System & Notifications ---');

// 1. Verify index.html contains required landing elements and styles
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

assert(html.includes('id="game-notification"'), 'index.html must include #game-notification element');
assert(html.includes('id="planet-modal"'), 'index.html must include #planet-modal element');
assert(html.includes('id="planet-modal-title"'), 'index.html must include #planet-modal-title');
assert(html.includes('id="planet-modal-description"'), 'index.html must include #planet-modal-description');
assert(html.includes('id="planet-depart-btn"'), 'index.html must include #planet-depart-btn');
assert(html.includes('Depart</button>'), 'Depart button must be labeled "Depart"');

// Check relative layout order
const posContainer = html.indexOf('id="game-container"');
const posNotification = html.indexOf('id="game-notification"');
const posModal = html.indexOf('id="planet-modal"');
assert(posContainer !== -1 && posNotification > posContainer, '#game-notification must be inside #game-container');
assert(posModal > posNotification, '#planet-modal must be inside #game-container');
console.log('✓ index.html structure verified');

// 2. Mock environment to test main.js logic
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
          stopPropagation: () => {},
          clientX: evt.clientX || 0,
          clientY: evt.clientY || 0,
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
  src: '',
  blur: () => {},
  width: 1000,
  height: 600,
});

const domMap = new Map();
global.document = {
  getElementById: (id) => {
    if (!domMap.has(id)) {
      const el = mockElement();
      if (id === 'planet-modal') {
        el.classList.add('hidden');
      }
      domMap.set(id, el);
    }
    return domMap.get(id);
  },
  createElement: (tag) => {
    const el = mockElement();
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
      this.position = { set: (x, y) => { this.x = x; this.y = y; }, x: 0, y: 0 };
      this.pivot = { set: (x, y) => { this.pivot.x = x; this.pivot.y = y; }, x: 0, y: 0 };
      this.rotation = 0;
      this.visible = true;
    }
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
    clear() {}
    rect() {}
    fill() {}
    stroke() {}
    moveTo() {}
    lineTo() {}
    circle() {}
  },
  Particle: class {
    constructor(opts) {
      this.x = (opts && opts.x) || 0;
      this.y = (opts && opts.y) || 0;
      this.anchorX = (opts && opts.anchorX) || 0;
      this.anchorY = (opts && opts.anchorY) || 0;
      this.texture = opts && opts.texture;
    }
  },
  ParticleContainer: class {
    constructor(opts) {
      this.texture = opts && opts.texture;
      this.particles = [];
      this.visible = true;
    }
    addParticle(p) { this.particles.push(p); }
    removeParticle(p) {
      const idx = this.particles.indexOf(p);
      if (idx !== -1) this.particles.splice(idx, 1);
    }
  },
  Sprite: class {
    constructor(texture) {
      this.texture = texture;
      this.position = { set: (x, y) => { this.x = x; this.y = y; }, x: 0, y: 0 };
      this.pivot = { set: (x, y) => { this.pivot.x = x; this.pivot.y = y; }, x: 0, y: 0 };
      this.rotation = 0;
      this.visible = true;
      this.children = [];
    }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
      return c;
    }
  },
  Assets: {
    load: async () => {},
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
    PLANETS_DATA,
    buildShip,
    showGameNotification,
  };
`);

const exp = runCode();
const { setup, PLANETS_DATA } = exp;

// 3. Test Planet Descriptions
console.log('Testing PLANETS_DATA descriptions...');
assert(Array.isArray(PLANETS_DATA) && PLANETS_DATA.length >= 3, 'PLANETS_DATA must have at least 3 planets');
for (const planet of PLANETS_DATA) {
  assert(typeof planet.description === 'string' && planet.description.length > 30, `Planet ${planet.name} must have a detailed description`);
  assert(/\b(you|your|You|Your)\b/.test(planet.description), `Planet ${planet.name} description must be written in the second person`);
}
console.log('✓ All planets have second-person descriptive text');

// Run setup
setup();

const playerShip = global.window.playerShip;
const planets = global.window.planets;
const attemptLanding = global.window.attemptLanding;
const departPlanet = global.window.departPlanet;
const showGameNotification = global.window.showGameNotification;
const gameLoop = global.window.gameLoop;

const notifEl = document.getElementById('game-notification');
const modalEl = document.getElementById('planet-modal');
const titleEl = document.getElementById('planet-modal-title');
const descEl = document.getElementById('planet-modal-description');
const departBtn = document.getElementById('planet-depart-btn');

assert(typeof attemptLanding === 'function', 'attemptLanding must be exported');
assert(typeof departPlanet === 'function', 'departPlanet must be exported');
assert(typeof showGameNotification === 'function', 'showGameNotification must be exported');

// 4. Test Notification function (text display, linger, and fade)
console.log('Testing notification display...');
let timeoutCallback = null;
let timeoutDelay = null;
global.setTimeout = (fn, ms) => {
  timeoutCallback = fn;
  timeoutDelay = ms;
  return 12345;
};
global.clearTimeout = () => {};

showGameNotification('Test notification message');
assert.strictEqual(notifEl.textContent, 'Test notification message', 'Notification textContent should match');
assert(notifEl.classList.contains('visible'), 'Notification must have visible class');
assert(!notifEl.classList.contains('fade-out'), 'Notification must not have fade-out class immediately');
assert.strictEqual(timeoutDelay, 5000, 'Notification must linger for 5000ms (5 seconds)');

// Trigger the fade-out callback
assert(typeof timeoutCallback === 'function', 'Timeout callback must be registered');
timeoutCallback();
assert(!notifEl.classList.contains('visible'), 'visible class must be removed on fade');
assert(notifEl.classList.contains('fade-out'), 'fade-out class must be added');

console.log('✓ showGameNotification correctly updates DOM, lingers for 5s, and fades');

// 5. Test L key handler registration
const keydownListeners = windowListeners['keydown'];
assert(Array.isArray(keydownListeners) && keydownListeners.length > 0, 'keydown listener must be registered on window');

function triggerKey(code, key, keyCode) {
  let prevented = false;
  const evt = {
    code,
    key,
    keyCode,
    target: { tagName: 'DIV' },
    preventDefault: () => { prevented = true; },
  };
  for (const fn of keydownListeners) {
    fn(evt);
  }
  return prevented;
}

// 6. Test Landing when far away from any planet
console.log('Testing landing attempt when far from any planets...');
playerShip.sprite.x = 500;
playerShip.sprite.y = 300;
playerShip.data.vx = 0;
playerShip.data.vy = 0;

// Move all planets far away
for (const p of planets) {
  p.sprite.x = 9999;
  p.sprite.y = 9999;
}

const preventedL = triggerKey('KeyL', 'l', 76);
assert(preventedL, 'KeyL should prevent default');
assert.strictEqual(notifEl.textContent, "You're not close enough to any locations to land.", 'Must show not close enough message');
assert.strictEqual(global.window.isLanded, false, 'isLanded should remain false');
assert(modalEl.classList.contains('hidden'), 'Modal should remain hidden');
console.log('✓ Far away check passes with expected notification');

// 7. Test Landing when over a planet but velocity too high (>= 10 m/s)
console.log('Testing landing attempt when moving too fast...');
const sugarPlanet = planets.find(p => p.data.name === 'Sugar');
assert(sugarPlanet, 'Sugar planet must exist');

// Move Sugar right on top of player ship
sugarPlanet.sprite.x = playerShip.sprite.x;
sugarPlanet.sprite.y = playerShip.sprite.y;

// Set velocity to 12 m/s
playerShip.data.vx = 12;
playerShip.data.vy = 0;

triggerKey('KeyL', 'l', 76);
assert.strictEqual(notifEl.textContent, "You're moving too quickly to land.", 'Must show moving too quickly message');
assert.strictEqual(global.window.isLanded, false, 'isLanded should remain false');
assert(modalEl.classList.contains('hidden'), 'Modal should remain hidden');
console.log('✓ High velocity check passes with expected notification');

// 8. Test Landing when over a planet and velocity < 10 m/s (both checks pass!)
console.log('Testing successful landing...');
// Set velocity to 6 m/s (< 10)
playerShip.data.vx = 6;
playerShip.data.vy = 0;

triggerKey('KeyL', 'l', 76);
assert.strictEqual(global.window.isLanded, true, 'isLanded must be true');
assert.strictEqual(playerShip.data.vx, 0, 'Player ship vx must be zeroed on landing');
assert.strictEqual(playerShip.data.vy, 0, 'Player ship vy must be zeroed on landing');
assert(!modalEl.classList.contains('hidden'), 'Modal must not have hidden class');
assert.strictEqual(titleEl.textContent, 'Sugar', 'Modal title should display planet name');
assert.strictEqual(descEl.textContent, sugarPlanet.data.description, 'Modal should display planet description');
console.log('✓ Successful landing opens modal with planet name and description');

// 9. Test Game Pause while landed
console.log('Testing game pause while landed...');
const initialRotation = playerShip.sprite.rotation;
// Calling gameLoop while landed should return early and do nothing
gameLoop(1);
assert.strictEqual(playerShip.sprite.rotation, initialRotation, 'Game loop should be paused while landed');
console.log('✓ Game pause while landed verified');

// 10. Test Depart button returns player to space and unpauses
console.log('Testing Depart button...');
departBtn.click();
assert.strictEqual(global.window.isLanded, false, 'isLanded must be false after departing');
assert(modalEl.classList.contains('hidden'), 'Modal must be hidden after departing');

// Now gameLoop should run normally
gameLoop(1);
console.log('✓ Depart button correctly resumes gameplay');

console.log('\n--- All Planet Landing tests passed! ---');
