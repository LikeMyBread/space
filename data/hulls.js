'use strict';

/**
 * Ship Hull definitions: mass, armor, pivot offsets, engine mounts,
 * hitbox radii, shield radii, and weapon hardpoints.
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
  const HULLS_DATA = [
    {
      name: 'Anvil',
      mass: 1416, // kg
      armor: 10,
      pivot: { x: 15.5, y: 16.5 },
      engine_mounts: [
        { x: 15, y: 24 },
      ],
      engine_mount: { x: 15, y: 24 },
      img: 'img/ships/Anvil.png',
      hullRadius: 7,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 15, y: 17 },
        },
      ],
    },
    {
      name: 'Avocado',
      mass: 3804, // kg
      armor: 10,
      pivot: { x: 15.5, y: 20 },
      engine_mounts: [
        { x: 15, y: 28 },
      ],
      engine_mount: { x: 15, y: 28 },
      img: 'img/ships/Avocado.png',
      hullRadius: 7,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: true,
          location: { x: 15, y: 20 },
        },
      ],
    },
    {
      name: 'Boat',
      mass: 8977, // kg
      armor: 40,
      pivot: { x: 17.5, y: 17 },
      engine_mounts: [
        { x: 10, y: 25 },
        { x: 23, y: 25 },
      ],
      engine_mount: { x: 10, y: 25 },
      img: 'img/ships/Boat.png',
      hullRadius: 8,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: true,
          location: { x: 12, y: 8 },
        },
        {
          size: 0,
          onTop: true,
          location: { x: 20, y: 8 },
        },
      ],
    },
    {
      name: 'Crab',
      mass: 2119, // kg
      armor: 10,
      pivot: { x: 16.5, y: 18 },
      engine_mounts: [
        { x: 15, y: 25 },
      ],
      engine_mount: { x: 15, y: 25 },
      img: 'img/ships/Crab.png',
      hullRadius: 7,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 4, y: 11 },
        },
        {
          size: 0,
          onTop: false,
          location: { x: 27, y: 11 },
        },
      ],
    },
    {
      name: 'Delta',
      mass: 906, // kg
      armor: 10,
      pivot: { x: 15.5, y: 18 },
      engine_mounts: [
        { x: 14, y: 25 },
      ],
      engine_mount: { x: 14, y: 25 },
      img: 'img/ships/Delta.png',
      hullRadius: 6,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 14, y: 16 },
        },
      ],
    },
    {
      name: 'Hammer',
      mass: 1743, // kg
      armor: 100,
      pivot: { x: 16.5, y: 15 },
      engine_mounts: [
        { x: 15, y: 24 },
      ],
      engine_mount: { x: 15, y: 24 },
      img: 'img/ships/Hammer.png',
      hullRadius: 8,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 6, y: 9 },
        },
        {
          size: 0,
          onTop: false,
          location: { x: 11, y: 8 },
        },
        {
          size: 0,
          onTop: false,
          location: { x: 20, y: 8 },
        },
        {
          size: 0,
          onTop: false,
          location: { x: 25, y: 9 },
        },
      ],
    },
    {
      name: 'Protogon',
      mass: 3643, // kg
      armor: 10,
      pivot: { x: 11, y: 13 },
      engine_mounts: [
        { x: 9, y: 20 },
      ],
      engine_mount: { x: 9, y: 20 },
      img: 'img/ships/Protogon.png',
      hullRadius: 7,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 9, y: 12 },
        },
      ],
    },
    {
      name: 'Shadow',
      mass: 2767, // kg
      armor: 10,
      pivot: { x: 15.5, y: 17 },
      engine_mounts: [
        { x: 13, y: 27 },
        { x: 18, y: 27 },
      ],
      engine_mount: { x: 13, y: 27 },
      img: 'img/ships/Shadow.png',
      hullRadius: 10,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 14, y: 8 },
        },
        {
          size: 0,
          onTop: false,
          location: { x: 17, y: 8 },
        },
      ],
    },
    {
      name: 'Shuttle',
      mass: 2050, // kg
      armor: 10,
      pivot: { x: 14.5, y: 16 },
      engine_mounts: [
        { x: 14, y: 26 },
      ],
      engine_mount: { x: 14, y: 26 },
      img: 'img/ships/Shuttle.png',
      hullRadius: 6,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 8, y: 15 },
        },
      ],
    },
    {
      name: 'Skate',
      mass: 1865, // kg
      armor: 10,
      pivot: { x: 15.5, y: 14 },
      engine_mounts: [
        { x: 15, y: 23 },
      ],
      engine_mount: { x: 15, y: 23 },
      img: 'img/ships/Skate.png',
      hullRadius: 7,
      shieldRadius: 20,
      hardpoints: [
        {
          size: 0,
          onTop: false,
          location: { x: 15, y: 14 },
        },
      ],
    },
  ];

  return {
    HULLS_DATA,
  };
});
