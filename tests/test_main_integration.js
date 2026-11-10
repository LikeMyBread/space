const path = require('path');
const fs = require('fs');

const mockElement = () => ({
  style: {},
  addEventListener: () => {},
  appendChild: () => {},
  getContext: () => ({
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
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

global.document = {
  getElementById: (id) => mockElement(),
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
      this.pivot = { set: (x, y) => { this.pivot.x = x; this.pivot.y = y; }, x: 0, y: 0 };
      this.position = { set: (x, y) => { this.position.x = x; this.position.y = y; }, x: 0, y: 0 };
      this.x = 0;
      this.y = 0;
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
  },
  Graphics: class {
    constructor() {}
    clear() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
  },
  Sprite: class {
    constructor(tex) {
      this.texture = tex;
      this.pivot = { set: (x, y) => { this.pivot.x = x; this.pivot.y = y; }, x: 0, y: 0 };
      this.position = { set: (x, y) => { this.position.x = x; this.position.y = y; }, x: 0, y: 0 };
      this.x = 0;
      this.y = 0;
      this.rotation = 0;
      this.visible = true;
    }
    destroy() {}
  },
  Texture: {
    from: () => ({}),
  },
  Assets: {
    load: async () => {},
    get: () => ({}),
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

// Wrap in a test runner function
const runTest = new Function(`
  ${code}
  return {
    setup,
    HULLS_DATA,
    ENGINES_DATA,
    FACTION_PAINTS,
    buildShip,
    checkSpeed,
    formFleet,
    ACCEL_LIMIT
  };
`);

const { setup, HULLS_DATA, ENGINES_DATA, FACTION_PAINTS, buildShip, checkSpeed, formFleet, ACCEL_LIMIT } = runTest();

console.log('Testing setup() invocation (checking for initialization errors)...');
// Set up mock app.stage
global.app = {
  stage: new PIXI.Container(),
  ticker: { add: (fn) => {}, FPS: 60 }
};

setup();
console.log('setup() executed successfully without any TDZ or initialization errors!');
