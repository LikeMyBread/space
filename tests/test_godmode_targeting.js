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
    toggle(c, force) {
      if (force === undefined) {
        if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      } else if (force) {
        this._classes.add(c);
      } else {
        this._classes.delete(c);
      }
    },
  },
  _listeners: {},
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  dispatch(event) {
    if (this._listeners[event]) {
      for (const fn of this._listeners[event]) {
        fn({ target: this });
      }
    }
  },
  click() {
    this.dispatch('click');
  },
  blur() {},
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
});

const elements = {};
global.document = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = mockElement();
      if (id.includes('select')) {
        elements[id].value = '';
      }
    }
    return elements[id];
  },
  createElement: (tag) => mockElement(),
};

global.window = {
  addEventListener: () => {},
};
global.performance = { now: () => Date.now() };

class PixiDisplayObject {
  constructor() {
    this._x = 0;
    this._y = 0;
    const self = this;
    this.position = {
      get x() { return self._x; },
      set x(v) { self._x = v; },
      get y() { return self._y; },
      set y(v) { self._y = v; },
      set: (x, y) => { self._x = x; self._y = y; },
    };
    this.pivot = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } };
    this.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } };
    this.rotation = 0;
    this.visible = true;
    this.children = [];
  }
  get x() { return this._x; }
  set x(v) { this._x = v; }
  get y() { return this._y; }
  set y(v) { this._y = v; }
  addChild(c) { this.children.push(c); return c; }
  removeChild(c) {
    const idx = this.children.indexOf(c);
    if (idx !== -1) this.children.splice(idx, 1);
    return c;
  }
  destroy() { this.destroyed = true; }
  clear() {}
  lineStyle() {}
  beginFill() {}
  endFill() {}
  drawCircle() {}
  drawRect() {}
  moveTo() {}
  lineTo() {}
}

global.PIXI = {
  Container: class extends PixiDisplayObject {},
  Graphics: class extends PixiDisplayObject {},
  Sprite: class extends PixiDisplayObject {
    static from() { return new global.PIXI.Sprite(); }
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
    buildShip,
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
  };
`);

const exported = runCode();
const { setup, buildShip, FACTION_PAINTS } = exported;

setup();

const playerShip = global.window.playerShip;
const findNearestHostile = global.window.findNearestHostile;
const updateNpcCombat = global.window.updateNpcCombat;
const handleShipHit = global.window.handleShipHit;
const godModeBtn = elements['god-mode-btn'];

const redPaint = FACTION_PAINTS.find((p) => p.name.includes('Vanguard')) || FACTION_PAINTS[0];
const bluePaint = FACTION_PAINTS.find((p) => p.name.includes('Aegis')) || FACTION_PAINTS[1];
const goldPaint = FACTION_PAINTS.find((p) => p.name.includes('Solar')) || FACTION_PAINTS[2];

// Ensure player is blue paint
playerShip.data.paint = bluePaint;
playerShip.sprite.position.set(500, 500);

console.log('--- 1. Testing Normal NPC Targeting with God Mode OFF ---');
global.window.isGodMode = false;

const redNpc = buildShip(null, null, redPaint);
redNpc.sprite.position.set(500, 600); // 100px away from playerShip
redNpc.data.combatStrategy = 'standoff';

const goldNpc = buildShip(null, null, goldPaint);
goldNpc.sprite.position.set(500, 800); // 300px away from playerShip, 200px away from redNpc

const combatPool = [playerShip, redNpc, goldNpc];

// With God Mode OFF, playerShip is closest hostile to redNpc (100px vs 200px)
let redTarget = findNearestHostile(redNpc, combatPool);
assert.strictEqual(redTarget, playerShip, 'Red NPC must target playerShip when god mode is OFF');
console.log('✓ Red NPC acquires playerShip as nearest hostile when God Mode is OFF');

// Retaliatory targeting with God Mode OFF
const normalPlayerProj = {
  shipId: playerShip.data.id,
  parentShip: playerShip,
  damage: 2,
};
redNpc.data.combatTarget = goldNpc;
handleShipHit(redNpc, normalPlayerProj, combatPool);
assert.strictEqual(redNpc.data.combatTarget, playerShip, 'Red NPC must switch target to playerShip when hit while god mode is OFF');
console.log('✓ Retaliatory targeting switches NPC target to playerShip when God Mode is OFF');

console.log('\n--- 2. Testing NPC Ignores Player Ship with God Mode ON ---');
// Turn God Mode ON via button
godModeBtn.click();
assert.strictEqual(global.window.isGodMode, true, 'God Mode should be ON');

// findNearestHostile should skip playerShip even though it is closest (100px vs 200px)
redTarget = findNearestHostile(redNpc, combatPool);
assert.strictEqual(redTarget, goldNpc, 'Red NPC must ignore playerShip and target the next nearest hostile (goldNpc)');
console.log('✓ findNearestHostile skips playerShip and selects other hostile NPC when God Mode is ON');

// If no other hostiles exist besides the god mode player, findNearestHostile returns null
const soloPool = [playerShip, redNpc];
const noTarget = findNearestHostile(redNpc, soloPool);
assert.strictEqual(noTarget, null, 'findNearestHostile must return null when only hostile is god mode player');
console.log('✓ findNearestHostile returns null when only hostile is god mode player');

console.log('\n--- 3. Testing Existing Target Dropped When God Mode Enabled ---');
// Give red NPC playerShip as combatTarget
redNpc.data.combatTarget = playerShip;

// Running combat loop frame: redNpc must drop playerShip and re-target goldNpc
updateNpcCombat(redNpc, 1, 1 / 60, combatPool);
assert.strictEqual(redNpc.data.combatTarget, goldNpc, 'Combat AI must drop playerShip and switch to goldNpc during combat update');
console.log('✓ updateNpcCombat re-evaluates and drops playerShip when God Mode is ON');

// If only playerShip exists, combatTarget becomes null
redNpc.data.combatTarget = playerShip;
updateNpcCombat(redNpc, 1, 1 / 60, soloPool);
assert.strictEqual(redNpc.data.combatTarget, null, 'Combat AI clears target when only god mode player exists');
console.log('✓ updateNpcCombat clears combatTarget to null when no other hostile exists');

console.log('\n--- 4. Testing Retaliatory Targeting Ignored When God Mode ON ---');
redNpc.data.combatTarget = goldNpc;
const godPlayerProj = {
  shipId: playerShip.data.id,
  parentShip: playerShip,
  damage: 2,
};
handleShipHit(redNpc, godPlayerProj, combatPool);
assert.strictEqual(redNpc.data.combatTarget, goldNpc, 'Red NPC must NOT switch target to playerShip when hit by god mode player');
console.log('✓ Red NPC ignores playerShip for retaliatory targeting when God Mode is ON');

console.log('\n--- 5. Testing Player Ship Can Still Target Enemies with God Mode ON ---');
const playerTarget = findNearestHostile(playerShip, combatPool);
assert.strictEqual(playerTarget, redNpc, 'Player ship in god mode must still be able to target nearest hostile (redNpc at 100px)');
console.log('✓ Player ship in God Mode can still target hostiles normally');

console.log('\n--- 6. Testing Toggling God Mode OFF Restores Targeting ---');
godModeBtn.click();
assert.strictEqual(global.window.isGodMode, false, 'God Mode should be OFF');

redTarget = findNearestHostile(redNpc, combatPool);
assert.strictEqual(redTarget, playerShip, 'Red NPC must target playerShip again when God Mode is toggled OFF');
console.log('✓ Toggling God Mode OFF restores playerShip as a valid hostile target');

console.log('\nAll God Mode targeting tests passed successfully! 🛡️');
