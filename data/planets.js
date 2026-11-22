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
      description: 'You look out upon a serene, frost-veiled world blanketed in pale carbonate dunes and sparkling crystalline plains. High-altitude ice plumes catch the distant starlight, drifting lazily across vast glassy flats. Beneath its deceptively sweet, snow-white crust lies a geologically dormant world rich in subterranean mineral reserves and glacial reservoirs.',
      x: gw / 2 - 600,
      y: gh / 2 - 600,
      radius: 100,
    },
    {
      name: 'Pepper',
      img: 'img/planets/Pepper.png',
      description: 'You gaze across a rugged, copper-tinted landscape carved by arid basalt canyons and windswept mesas. Rust-colored dust devils swirl under an amber sky, kicking up pungent sulfurous silt and coarse mineral grit. Known throughout the sector for its harsh climate and rich deposits of volatile spice compounds and heavy ores, Pepper is a fierce but bountiful frontier planet.',
      x: gw / 2 + 1300,
      y: gh / 2 + 1100,
      radius: 100,
    },
    {
      name: 'Pepper II',
      img: 'img/planets/Pepper2.png',
      description: 'You stare into the dense, swirling storm bands of an untamed volcanic sister world. Through the violet auroral haze, jagged obsidian peaks rise above steaming caldera basins glowing with geothermal heat. Heavy with rare industrial isotopes and energized atmospheric gases, this high-pressure planet presents a dramatic, awe-inspiring panorama of primordial planetary forces.',
      x: gw / 2 - 2000,
      y: gh / 2 + 1800,
      radius: 100,
    },
  ];

  return {
    PLANETS_DATA,
  };
});
