const path = require('path');
const assert = require('assert');
const fs = require('fs');

console.log('--- Testing Pause Screen and Arrow Key Movement ---');

// 1. Verify index.html contains required pause screen elements, structure, and styles
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

assert(html.includes('id="pause-modal"'), 'index.html must include #pause-modal element');
assert(html.includes('id="pause-resume-btn"'), 'index.html must include #pause-resume-btn');
assert(html.includes('GAME PAUSED'), 'index.html must include "GAME PAUSED" title');
assert(html.includes('pause-bindings-list'), 'index.html must include .pause-bindings-list element');

// Check that #pause-modal is inside #game-container
const posContainer = html.indexOf('id="game-container"');
const posPauseModal = html.indexOf('id="pause-modal"');
assert(posContainer !== -1 && posPauseModal > posContainer, '#pause-modal must be inside #game-container');

// Check that control actions are present in the pause modal
assert(html.includes('Thrust Forward'), 'Pause modal must list Thrust Forward');
assert(html.includes('Reverse / Brake'), 'Pause modal must list Reverse / Brake');
assert(html.includes('Turn Left'), 'Pause modal must list Turn Left');
assert(html.includes('Turn Right'), 'Pause modal must list Turn Right');
assert(html.includes('Fire Primary Weapons'), 'Pause modal must list Fire Primary Weapons');
assert(html.includes('Cycle Target'), 'Pause modal must list Cycle Target');
assert(html.includes('Target Nearest Hostile'), 'Pause modal must list Target Nearest Hostile');
assert(html.includes('Land on Planet'), 'Pause modal must list Land on Planet');
assert(html.includes('Pause / Resume Game') || html.includes('Pause'), 'Pause modal must list Pause control');

console.log('✓ index.html pause modal structure and control bindings verified');

// 2. Set up DOM and PIXI mocks for main.js testing
const mockElement = (id = '') => ({
  id,
  style: {},
  classList: {
    _classes: new Set(id === 'pause-modal' || id === 'planet-modal' ? ['hidden'] : []),
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
      const el = mockElement(id);
      domMap.set(id, el);
    }
    return domMap.get(id);
  },
  createElement: (tag) => mockElement(tag),
};

const windowListeners = {};
global.window = {
  addEventListener: (event, fn) => {
    if (!windowListeners[event]) windowListeners[event] = [];
    windowListeners[event].push(fn);
  },
  removeEventListener: () => {},
  location: { reload: () => {} },
};
global.window.window = global.window;

// Load modular data files into globalThis
const constantsMod = require('../data/constants.js');
const keybindingsMod = require('../data/keybindings.js');
const hullsMod = require('../data/hulls.js');
const enginesMod = require('../data/engines.js');
const weaponsMod = require('../data/weapons.js');
const planetsMod = require('../data/planets.js');
const paintsMod = require('../data/paints.js');
const assetsMod = require('../data/assets.js');

Object.assign(globalThis, constantsMod);
Object.assign(globalThis, keybindingsMod);
Object.assign(globalThis, hullsMod);
Object.assign(globalThis, enginesMod);
Object.assign(globalThis, weaponsMod);
Object.assign(globalThis, planetsMod);
Object.assign(globalThis, paintsMod);
Object.assign(globalThis, assetsMod);

// Mock PIXI
class MockContainer {
  constructor() {
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.visible = true;
    this.pivot = { set: () => {}, x: 0, y: 0 };
    this.position = { set: (x, y) => { this.x = x; this.y = y; }, x: 0, y: 0 };
  }
  addChild(child) {
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }
}

class MockSprite extends MockContainer {
  constructor(texture) {
    super();
    this.texture = texture;
    this.anchor = { set: () => {}, x: 0.5, y: 0.5 };
    this.tint = 0xffffff;
  }
}

class MockGraphics extends MockContainer {
  constructor() {
    super();
  }
  clear() { return this; }
  lineStyle() { return this; }
  beginFill() { return this; }
  endFill() { return this; }
  drawCircle() { return this; }
  drawRect() { return this; }
  stroke() { return this; }
  fill() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  circle() { return this; }
  rect() { return this; }
}

global.PIXI = {
  Application: class {
    constructor() {
      this.canvas = mockElement('canvas');
      this.stage = new MockContainer();
      this.ticker = {
        add: () => {},
        FPS: 60,
      };
    }
    init() { return Promise.resolve(); }
  },
  Container: MockContainer,
  Sprite: MockSprite,
  Graphics: MockGraphics,
  Assets: {
    load: async () => {},
    get: () => ({ width: 200, height: 200 }),
  },
  Texture: {
    from: () => ({ width: 200, height: 200 }),
    WHITE: { width: 3, height: 3 },
  },
};

// Load main.js
let code = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf-8');
code = code.replace('const rawImages = {};', 'const rawImages = new Proxy({}, { get: () => ({ width: 200, height: 200 }) });');
code = code.replace('let app;', 'var app = global.app;');
code = code.replace(/init\(\)\.catch[\s\S]*$/, '');

let registeredTickerFn = null;
global.app = {
  canvas: mockElement('canvas'),
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
    pauseGame,
    unpauseGame,
    togglePause,
    isThrusting,
    isReversing,
    isTurningLeft,
    isTurningRight,
    isFiring,
    keyState,
    handleKeydown,
    handleKeyup,
  };
`);

const exp = runCode();
const {
  setup,
  pauseGame,
  unpauseGame,
  togglePause,
  isThrusting,
  isReversing,
  isTurningLeft,
  isTurningRight,
  isFiring,
  keyState,
  handleKeydown,
  handleKeyup,
} = exp;

setup();

const pauseModalEl = document.getElementById('pause-modal');
const resumeBtnEl = document.getElementById('pause-resume-btn');
const gameLoop = global.window.gameLoop;

// 3. Test Pause Functions and State
console.log('Testing pauseGame, unpauseGame, togglePause API...');
assert.strictEqual(global.window.isGamePaused, false, 'isGamePaused must initially be false');
assert(pauseModalEl.classList.contains('hidden'), '#pause-modal must initially have "hidden" class');

// Call pauseGame()
pauseGame();
assert.strictEqual(global.window.isGamePaused, true, 'pauseGame() must set isGamePaused to true');
assert(!pauseModalEl.classList.contains('hidden'), '#pause-modal must be visible when paused (hidden class removed)');

// Call unpauseGame()
unpauseGame();
assert.strictEqual(global.window.isGamePaused, false, 'unpauseGame() must set isGamePaused to false');
assert(pauseModalEl.classList.contains('hidden'), '#pause-modal must have hidden class when unpaused');

// Call togglePause()
togglePause();
assert.strictEqual(global.window.isGamePaused, true, 'togglePause() should pause when currently unpaused');
assert(!pauseModalEl.classList.contains('hidden'), '#pause-modal should be visible');

togglePause();
assert.strictEqual(global.window.isGamePaused, false, 'togglePause() should unpause when currently paused');
assert(pauseModalEl.classList.contains('hidden'), '#pause-modal should be hidden');

// Test Resume Button Click
pauseGame();
assert.strictEqual(global.window.isGamePaused, true, 'Game should be paused');
resumeBtnEl.click();
assert.strictEqual(global.window.isGamePaused, false, 'Clicking #pause-resume-btn must unpause the game');
assert(pauseModalEl.classList.contains('hidden'), '#pause-modal must be hidden after clicking resume');

console.log('✓ Pause API and resume button correctly toggle pause state and modal visibility');

// 4. Test Escape key handler
console.log('Testing Escape key handling...');
function sendKey(eventType, code, key, keyCode) {
  let defaultPrevented = false;
  const evt = {
    target: { tagName: 'DIV' },
    code,
    key,
    keyCode,
    preventDefault: () => { defaultPrevented = true; },
  };
  if (eventType === 'keydown') {
    handleKeydown(evt);
  } else {
    handleKeyup(evt);
  }
  return { defaultPrevented };
}

// Ensure game is initially unpaused
if (global.window.isGamePaused) unpauseGame();

// Press Escape
let res = sendKey('keydown', 'Escape', 'Escape', 27);
assert(res.defaultPrevented, 'Escape keydown should call preventDefault()');
assert.strictEqual(global.window.isGamePaused, true, 'Pressing Escape should pause the game');
assert(!pauseModalEl.classList.contains('hidden'), '#pause-modal should be visible');

// Press Escape again
res = sendKey('keydown', 'Escape', 'Escape', 27);
assert(res.defaultPrevented, 'Escape keydown should call preventDefault()');
assert.strictEqual(global.window.isGamePaused, false, 'Pressing Escape again should unpause the game');
assert(pauseModalEl.classList.contains('hidden'), '#pause-modal should be hidden');

// Test with lowercase 'escape' and keycode 27
res = sendKey('keydown', '', 'escape', 27);
assert.strictEqual(global.window.isGamePaused, true, 'Pressing Escape with key="escape" should pause the game');
res = sendKey('keydown', '', 'escape', 27);
assert.strictEqual(global.window.isGamePaused, false, 'Pressing Escape with key="escape" again should unpause');

console.log('✓ Escape key correctly toggles pause and unpause');

// 5. Test Game Loop and Input Freeze when Paused
console.log('Testing game simulation freeze while paused...');
const playerShip = global.window.playerShip;
const derelictShip = global.window.derelictShip;
playerShip.data.vx = 50;
playerShip.data.vy = 50;
const initialDerelictX = derelictShip.sprite.x;
const initialRotation = playerShip.sprite.rotation;

pauseGame();
assert.strictEqual(global.window.isGamePaused, true);

// While paused, attempt gameLoop
gameLoop(1);
// World state should not have moved because gameLoop returned early
assert.strictEqual(derelictShip.sprite.x, initialDerelictX, 'Derelict ship x must not change while paused');
assert.strictEqual(playerShip.sprite.rotation, initialRotation, 'Player rotation must not change while paused');

// While paused, inputs like Tab or X should not trigger actions
let tabActionFired = false;
global.window.cycleTarget = () => { tabActionFired = true; };
sendKey('keydown', 'Tab', 'Tab', 9);
assert.strictEqual(tabActionFired, false, 'Tab key should not cycle target while paused');

// Unpause and verify gameLoop runs and advances relative motion
unpauseGame();
gameLoop(1);
assert.notStrictEqual(derelictShip.sprite.x, initialDerelictX, 'Derelict ship x should update via relative velocity when unpaused');

console.log('✓ Game loop and gameplay actions are frozen while paused and resume when unpaused');

// 6. Test Movement Keys: Arrow Keys Only, WASD Removed
console.log('Testing movement keys: arrow keys only, WASD removed...');

// Clear keyState
for (const k in keyState) keyState[k] = false;

// Test W key (thrust) -> Should NOT thrust
keyState['KeyW'] = true;
keyState['w'] = true;
keyState[87] = true;
assert.strictEqual(isThrusting(), false, 'KeyW must NOT trigger thrust');

// Test ArrowUp -> SHOULD thrust
keyState['KeyW'] = false;
keyState['w'] = false;
keyState[87] = false;

keyState['ArrowUp'] = true;
assert.strictEqual(isThrusting(), true, 'ArrowUp must trigger thrust');
keyState['ArrowUp'] = false;

keyState['arrowup'] = true;
assert.strictEqual(isThrusting(), true, 'arrowup must trigger thrust');
keyState['arrowup'] = false;

keyState[38] = true;
assert.strictEqual(isThrusting(), true, 'KeyCode 38 must trigger thrust');
keyState[38] = false;

// Test S key (reverse) -> Should NOT reverse
keyState['KeyS'] = true;
keyState['s'] = true;
keyState[83] = true;
assert.strictEqual(isReversing(), false, 'KeyS must NOT trigger reverse');

// Test ArrowDown -> SHOULD reverse
keyState['KeyS'] = false;
keyState['s'] = false;
keyState[83] = false;

keyState['ArrowDown'] = true;
assert.strictEqual(isReversing(), true, 'ArrowDown must trigger reverse');
keyState['ArrowDown'] = false;

keyState['arrowdown'] = true;
assert.strictEqual(isReversing(), true, 'arrowdown must trigger reverse');
keyState['arrowdown'] = false;

keyState[40] = true;
assert.strictEqual(isReversing(), true, 'KeyCode 40 must trigger reverse');
keyState[40] = false;

// Test A key (turn left) -> Should NOT turn left
keyState['KeyA'] = true;
keyState['a'] = true;
keyState[65] = true;
assert.strictEqual(isTurningLeft(), false, 'KeyA must NOT trigger turn left');

// Test ArrowLeft -> SHOULD turn left
keyState['KeyA'] = false;
keyState['a'] = false;
keyState[65] = false;

keyState['ArrowLeft'] = true;
assert.strictEqual(isTurningLeft(), true, 'ArrowLeft must trigger turn left');
keyState['ArrowLeft'] = false;

keyState['arrowleft'] = true;
assert.strictEqual(isTurningLeft(), true, 'arrowleft must trigger turn left');
keyState['arrowleft'] = false;

keyState[37] = true;
assert.strictEqual(isTurningLeft(), true, 'KeyCode 37 must trigger turn left');
keyState[37] = false;

// Shift + ArrowLeft should not turn left (shift is used for reverse tab / modifier)
keyState['ArrowLeft'] = true;
keyState['ShiftLeft'] = true;
assert.strictEqual(isTurningLeft(), false, 'ArrowLeft + Shift must not trigger turn left');
keyState['ShiftLeft'] = false;
keyState['ArrowLeft'] = false;

// Test D key (turn right) -> Should NOT turn right
keyState['KeyD'] = true;
keyState['d'] = true;
keyState[68] = true;
assert.strictEqual(isTurningRight(), false, 'KeyD must NOT trigger turn right');

// Test ArrowRight -> SHOULD turn right
keyState['KeyD'] = false;
keyState['d'] = false;
keyState[68] = false;

keyState['ArrowRight'] = true;
assert.strictEqual(isTurningRight(), true, 'ArrowRight must trigger turn right');
keyState['ArrowRight'] = false;

keyState['arrowright'] = true;
assert.strictEqual(isTurningRight(), true, 'arrowright must trigger turn right');
keyState['arrowright'] = false;

keyState[39] = true;
assert.strictEqual(isTurningRight(), true, 'KeyCode 39 must trigger turn right');
keyState[39] = false;

console.log('✓ Only arrow keys control movement (WASD completely removed from flight)');

// 7. Test Click Targeting blocked when paused
console.log('Testing targeting click blocking while paused...');
const onMainScreenClick = global.window.onMainScreenClick;
const onRadarScreenClick = global.window.onRadarScreenClick;

pauseGame();
const mainClickRes = onMainScreenClick({ clientX: 200, clientY: 200 });
assert.strictEqual(mainClickRes, undefined, 'onMainScreenClick must return early without selecting when paused');

const radarClickRes = onRadarScreenClick({ clientX: 100, clientY: 100 });
assert.strictEqual(radarClickRes, undefined, 'onRadarScreenClick must return early without selecting when paused');

unpauseGame();
console.log('✓ Targeting clicks are blocked when paused');

console.log('--- All Pause Screen and Arrow Key Movement tests passed successfully! ---');
