'use strict';

/**
 * Engine definitions: thrust power, mass, reversible capabilities,
 * sprite assets, and lit/reverse states.
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
  const ENGINES_DATA = [
    {
      name: 'thruster',
      pivot: { x: 3, y: 1 },
      thrust: 50, // kN
      mass: 1500, // kg
      reversible: true,
      img: 'img/engines/Thruster.png',
      imgLit: 'img/engines/Thruster_lit.png',
      imgReverse: 'img/engines/Thruster_reverse.png',
    },
    {
      name: 'turbo_thruster',
      pivot: { x: 1, y: 2 },
      thrust: 100, // kN
      mass: 1500, // kg
      reversible: false,
      img: 'img/engines/TurboThruster.png',
      imgLit: 'img/engines/TurboThruster_lit.png',
    },
  ];

  return {
    ENGINES_DATA,
  };
});
