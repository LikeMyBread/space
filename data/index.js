'use strict';

/**
 * Unified index for all space game data modules.
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
  if (typeof require !== 'undefined') {
    const constants = require('./constants.js');
    const keybindings = require('./keybindings.js');
    const hulls = require('./hulls.js');
    const engines = require('./engines.js');
    const weapons = require('./weapons.js');
    const planets = require('./planets.js');
    const paints = require('./paints.js');
    const assets = require('./assets.js');

    return {
      ...constants,
      ...keybindings,
      ...hulls,
      ...engines,
      ...weapons,
      ...planets,
      ...paints,
      ...assets,
    };
  }

  return {
    CONSTANTS: (typeof globalThis !== 'undefined' && globalThis.CONSTANTS) || {},
    DEFAULT_KEYBINDINGS: (typeof globalThis !== 'undefined' && globalThis.DEFAULT_KEYBINDINGS) || {},
    GAME_KEYS: (typeof globalThis !== 'undefined' && globalThis.GAME_KEYS) || new Set(),
    HULLS_DATA: (typeof globalThis !== 'undefined' && globalThis.HULLS_DATA) || [],
    ENGINES_DATA: (typeof globalThis !== 'undefined' && globalThis.ENGINES_DATA) || [],
    WEAPONS_DATA: (typeof globalThis !== 'undefined' && globalThis.WEAPONS_DATA) || {},
    PLANETS_DATA: (typeof globalThis !== 'undefined' && globalThis.PLANETS_DATA) || [],
    FACTION_PAINTS: (typeof globalThis !== 'undefined' && globalThis.FACTION_PAINTS) || [],
    ASSET_PATHS: (typeof globalThis !== 'undefined' && globalThis.ASSET_PATHS) || [],
  };
});
