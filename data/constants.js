'use strict';

/**
 * Universal game constants and balance parameters.
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
  // Viewport & screen dimensions
  const GAME_WIDTH = 1000;
  const GAME_HEIGHT = 600;
  const OFFSCREEN = 100;
  const CULL_MARGIN = 80;
  const PLANET_CULL_MARGIN = 150;

  // Physics & Flight
  const PIXELS_PER_METER = 1;
  const TURN_RATE = 0.04; // rad/frame (~2.4 rad/s at 60fps)
  const ACCEL_LIMIT = 5; // seconds to reach max speed from standstill
  const FORMATION_DISTANCE = 100; // px spacing between ships in formation
  const DISABLED_ARMOR_THRESHOLD = 0.2; // 20% armor threshold before ship is disabled
  const DEFAULT_SHIELD_REGEN_RATE = 0.5; // points per second
  const LANDING_SPEED_LIMIT = 10; // m/s (px/s) maximum speed to land on planets

  // Visual debugging overlays
  const PIVOT_SIZE = 3; // px size of pivot highlight
  const PIVOT_HALF = Math.floor(PIVOT_SIZE / 2);

  // Radar display & logarithmic distance scaling
  const RADAR_MAX_DIST = 4000; // meters
  const RADAR_LOG_K = 500;
  const RADAR_LOG_NORM = 1 / Math.log1p(RADAR_MAX_DIST / RADAR_LOG_K);
  const RADAR_RINGS = [500, 1000, 2000, 4000];
  const RADAR_RADIUS = 86; // Scope circle outer radius
  const RADAR_MAX_R = 83; // Scope radius minus margin

  // Combat Strategy parameters
  const MAX_TURN_FIGHT_APPROACH_SPEED = 25; // px/s relative approach speed
  const JOUST_ATTACK_RANGE_MULT = 1.5;
  const STANDOFF_RANGE_MULT = 1.5;

  // Hexagonal Grid & Formation directions
  const HEX_DIRECTIONS = [
    { q: 1, r: 0, s: -1 },
    { q: 1, r: -1, s: 0 },
    { q: 0, r: -1, s: 1 },
    { q: -1, r: 0, s: 1 },
    { q: -1, r: 1, s: 0 },
    { q: 0, r: 1, s: -1 },
  ];

  const CONSTANTS = {
    GAME_WIDTH,
    GAME_HEIGHT,
    OFFSCREEN,
    CULL_MARGIN,
    PLANET_CULL_MARGIN,
    PIXELS_PER_METER,
    TURN_RATE,
    ACCEL_LIMIT,
    FORMATION_DISTANCE,
    DISABLED_ARMOR_THRESHOLD,
    DEFAULT_SHIELD_REGEN_RATE,
    LANDING_SPEED_LIMIT,
    PIVOT_SIZE,
    PIVOT_HALF,
    RADAR_MAX_DIST,
    RADAR_LOG_K,
    RADAR_LOG_NORM,
    RADAR_RINGS,
    RADAR_RADIUS,
    RADAR_MAX_R,
    MAX_TURN_FIGHT_APPROACH_SPEED,
    JOUST_ATTACK_RANGE_MULT,
    STANDOFF_RANGE_MULT,
    HEX_DIRECTIONS,
  };

  return {
    ...CONSTANTS,
    CONSTANTS,
  };
});
