'use strict';

/**
 * Default keybindings and input mappings for spaceflight, combat, targeting, and UI actions.
 */
(function (root, factory) {
  const exported = factory();
  if (typeof globalThis !== 'undefined') {
    Object.assign(globalThis, exported);
  }
  if (typeof root !== 'undefined' && root !== globalThis) {
    Object.assign(root, exported);
  }
  if (typeof module === 'object' && module && module.exports) {
    module.exports = exported;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  const DEFAULT_KEYBINDINGS = {
    thrust: {
      name: 'Thrust Forward',
      keys: ['ArrowUp', 'arrowup'],
      keyCodes: [38],
    },
    reverse: {
      name: 'Reverse / Brake',
      keys: ['ArrowDown', 'arrowdown'],
      keyCodes: [40],
    },
    turnLeft: {
      name: 'Turn Left',
      keys: ['ArrowLeft', 'arrowleft'],
      keyCodes: [37],
    },
    turnRight: {
      name: 'Turn Right',
      keys: ['ArrowRight', 'arrowright'],
      keyCodes: [39],
    },
    fire: {
      name: 'Fire Primary Weapons',
      keys: ['Space', ' ', 'space'],
      keyCodes: [32],
    },
    cycleTarget: {
      name: 'Cycle Target',
      keys: ['Tab', 'tab'],
      keyCodes: [9],
    },
    selectNearestHostile: {
      name: 'Target Nearest Hostile',
      keys: ['KeyX', 'x'],
      keyCodes: [88],
    },
    land: {
      name: 'Land on Planet',
      keys: ['KeyL', 'l'],
      keyCodes: [76],
    },
    pause: {
      name: 'Pause / Controls',
      keys: ['Escape', 'escape'],
      keyCodes: [27],
    },
  };

  // Set of all primary game flight keys used to prevent browser scroll and handle input state
  const GAME_KEYS = new Set([
    'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'ShiftLeft', 'ShiftRight',
    'Space', ' ', 'space',
    'arrowup', 'arrowleft', 'arrowdown', 'arrowright',
    'shift',
  ]);

  function isBindingPressed(actionBinding, keyState) {
    if (!actionBinding || !keyState) return false;
    if (Array.isArray(actionBinding.keys)) {
      for (const k of actionBinding.keys) {
        if (keyState[k]) return true;
      }
    }
    if (Array.isArray(actionBinding.keyCodes)) {
      for (const code of actionBinding.keyCodes) {
        if (keyState[code]) return true;
      }
    }
    return false;
  }

  function isEventMatch(actionBinding, event) {
    if (!actionBinding || !event) return false;
    const code = event.code;
    const key = event.key ? event.key.toLowerCase() : '';
    const keyCode = event.keyCode;

    if (Array.isArray(actionBinding.keys)) {
      if (code && actionBinding.keys.includes(code)) return true;
      if (key && actionBinding.keys.map((k) => k.toLowerCase()).includes(key)) return true;
    }
    if (Array.isArray(actionBinding.keyCodes)) {
      if (keyCode && actionBinding.keyCodes.includes(keyCode)) return true;
    }
    return false;
  }

  return {
    DEFAULT_KEYBINDINGS,
    GAME_KEYS,
    isBindingPressed,
    isEventMatch,
  };
});
