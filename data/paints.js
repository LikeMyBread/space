'use strict';

/**
 * Faction paint schemes: color swatches, hex codes, and factory shade replacements.
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
  const FACTION_PAINTS = [
    { name: 'Red', hex: '#d42121', r: 212, g: 33, b: 33, label: 'Crimson Vanguard' },
    { name: 'Blue', hex: '#216cd4', r: 33, g: 108, b: 212, label: 'Cobalt Federation' },
    { name: 'Green', hex: '#21d454', r: 33, g: 212, b: 84, label: 'Emerald Syndicate' },
    { name: 'Gold', hex: '#d4a321', r: 212, g: 163, b: 33, label: 'Solaris Guild' },
    { name: 'Purple', hex: '#9d21d4', r: 157, g: 33, b: 212, label: 'Nebula Fleet' },
    { name: 'Cyan', hex: '#21c2d4', r: 33, g: 194, b: 212, label: 'Outer Colonies' },
    { name: 'Orange', hex: '#d45e21', r: 212, g: 94, b: 33, label: 'Corsair Raiders' },
    { name: 'Pink', hex: '#d4218b', r: 212, g: 33, b: 139, label: 'Nova Collective' },
  ];

  return {
    FACTION_PAINTS,
  };
});
