'use strict';

/**
 * Planet system definitions: orbital coordinates, radii, graphic assets,
 * and narrative descriptions for planetary exploration and landing.
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
  const gw = typeof GAME_WIDTH !== 'undefined' ? GAME_WIDTH : (typeof globalThis !== 'undefined' && globalThis.GAME_WIDTH) || 1000;
  const gh = typeof GAME_HEIGHT !== 'undefined' ? GAME_HEIGHT : (typeof globalThis !== 'undefined' && globalThis.GAME_HEIGHT) || 600;

  const PLANETS_DATA = [
    {
      name: 'Sugar',
      img: 'img/planets/Sugar.png',
      description: 'Sugar is a frozen world from the poles to the equator. The spaceport is nestled in a crevasse, offering a bit of protection from the constant winds.',
      x: gw / 2 - 600,
      y: gh / 2 - 600,
      radius: 100,
    },
    {
      name: 'Pepper',
      img: 'img/planets/Pepper.png',
      description: 'The mines of Pepper work constantly, with workers living in habitats deep underground for months at a time.',
      x: gw / 2 + 1300,
      y: gh / 2 + 1100,
      radius: 100,
    },
    {
      name: 'Pepper II',
      img: 'img/planets/Pepper2.png',
      description: 'Mining is officially banned on Pepper II due to the extreme danger of its constant volcanic activity, but that doesn\'t stop wildcatters from trying. The precious ores make the survivors rich.',
      x: gw / 2 - 2000,
      y: gh / 2 + 1800,
      radius: 100,
    },
  ];

  return {
    PLANETS_DATA,
  };
});
