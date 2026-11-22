'use strict';

/**
 * Weapon definitions: damage, mount sizes, attachment points,
 * fire rates, and projectile characteristics.
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
  const WEAPONS_DATA = {
    light_blaster: {
      name: 'Light Blaster',
      damage: 1,
      img: 'img/weapons/Blaster.png',
      size: 0,
      attachmentPoint: { x: 2, y: 10 }, // down and to the right of top left corner (0-indexed)
      projectileOrigin: { x: 2, y: 2 }, // relative to weapon top-left
      fireRate: 2, // shots per second
      projectile: {
        damage: 1,
        img: 'img/weapons/Blaster Bolt.png',
        pivot: { x: 1, y: 1 },
        speed: 100, // px/s
        rotation: 0.1, // spin speed in rad/tick
        rotationSpeed: 0.1,
        lifetime: 0.875, // seconds (range is 87.5px at 100 px/s)
      },
    },
  };

  return {
    WEAPONS_DATA,
  };
});
