'use strict';

/**
 * Static asset paths for textures loaded by PixiJS Assets and the image preloader.
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
  const ASSET_PATHS = [
    'img/ships/Anvil.png',
    'img/ships/Avocado.png',
    'img/ships/Boat.png',
    'img/ships/Crab.png',
    'img/ships/Delta.png',
    'img/ships/Hammer.png',
    'img/ships/Protogon.png',
    'img/ships/Shadow.png',
    'img/ships/Shuttle.png',
    'img/ships/Skate.png',
    'img/engines/Thruster.png',
    'img/engines/Thruster_lit.png',
    'img/engines/Thruster_reverse.png',
    'img/engines/TurboThruster.png',
    'img/engines/TurboThruster_lit.png',
    'img/weapons/Blaster.png',
    'img/weapons/Blaster Bolt.png',
    'img/stars/Star.png',
    'img/planets/Sugar.png',
    'img/planets/Pepper.png',
    'img/planets/Pepper2.png',
  ];

  return {
    ASSET_PATHS,
  };
});
