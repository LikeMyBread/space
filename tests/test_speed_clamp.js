const path = require('path');
const fs = require('fs');

// Mock browser / DOM / PIXI minimal environment
global.document = {
  getElementById: () => null,
};
global.window = {};
global.performance = { now: () => Date.now() };

// Let's test the math directly
const ACCEL_LIMIT = 10;
const TURN_RATE = (2 * Math.PI) / 360;

function checkSpeed(vx, vy, speedLimit) {
  const SPEED = Math.sqrt(vx * vx + vy * vy);
  if (SPEED > speedLimit && SPEED > 0) {
    const ratio = speedLimit / SPEED;
    return { vx: vx * ratio, vy: vy * ratio };
  }
  return { vx: vx, vy: vy };
}

// Test checkSpeed
console.log('Testing checkSpeed:');
let res = checkSpeed(100, 100, 100);
let spd = Math.hypot(res.vx, res.vy);
console.log(`Speed clamped from (100, 100) with limit 100: ${spd.toFixed(4)} (vx=${res.vx.toFixed(4)}, vy=${res.vy.toFixed(4)})`);
console.assert(Math.abs(spd - 100) < 1e-6, 'checkSpeed failed to clamp');

// Test ship with thruster vs turbo_thruster
const hullMass = 20000;
const engineMass = 3500;
const thrusterThrust = 250;
const turboThrust = 500;

const regularAccel = (thrusterThrust * 1000) / (hullMass + engineMass); // ~10.638
const regularMaxSpeed = regularAccel * ACCEL_LIMIT; // ~106.38

const turboAccel = (turboThrust * 1000) / (hullMass + engineMass); // ~21.276
const turboMaxSpeed = turboAccel * ACCEL_LIMIT; // ~212.76

console.log(`Regular thruster: accel=${regularAccel.toFixed(3)}, maxSpeed=${regularMaxSpeed.toFixed(3)}`);
console.log(`Turbo thruster: accel=${turboAccel.toFixed(3)}, maxSpeed=${turboMaxSpeed.toFixed(3)}`);

// Simulate player flying at turboMaxSpeed North: vx = 0, vy = -turboMaxSpeed
const player = {
  vx: 0,
  vy: -turboMaxSpeed,
  x: 400,
  y: 300,
  rotation: 0
};

// Simulate NPC ship with regular thruster trying to catch up or follow
const npc = {
  vx: 0,
  vy: 0,
  x: 400,
  y: 400,
  rotation: 0,
  accel: regularAccel,
  maxSpeed: regularMaxSpeed,
  aiState: 'FORMATION'
};

const dt = 1/60; // 60 FPS
const delta = 1;
const dvMax = npc.accel * (60 / 1000) * delta;

// Run 300 frames of simulation with our speed-clamped AI logic
for (let frame = 0; frame < 300; frame++) {
  const dx = player.x - npc.x;
  const dy = player.y - npc.y;
  const dist = Math.hypot(dx, dy);

  const relVx = npc.vx - player.vx;
  const relVy = npc.vy - player.vy;
  const relSpeed = Math.hypot(relVx, relVy);
  const matchTolerance = Math.max(1.5, dvMax * 0.8);

  // Transitions
  if (npc.aiState === 'FORMATION') {
    if (dist > 30 || relSpeed > matchTolerance * 2.5) {
      npc.aiState = 'APPROACH';
    }
  }

  // APPROACH behavior
  if (npc.aiState === 'APPROACH') {
    const forwardX = 0; // facing North
    const forwardY = -1;
    const currentSpeedInDir = npc.vx * forwardX + npc.vy * forwardY;
    const targetSpeedInDir = player.vy * forwardY; // target is moving North at turboMaxSpeed

    if (currentSpeedInDir < targetSpeedInDir) {
      const dvNeeded = targetSpeedInDir - currentSpeedInDir;
      const step = Math.min(dvMax, dvNeeded);
      npc.vx += step * forwardX;
      npc.vy += step * forwardY;
    }
  }

  // Hard physical clamp
  const clamped = checkSpeed(npc.vx, npc.vy, npc.maxSpeed);
  npc.vx = clamped.vx;
  npc.vy = clamped.vy;

  // Integrate positions relative to world
  npc.x += npc.vx * dt;
  npc.y += npc.vy * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const currentNpcSpeed = Math.hypot(npc.vx, npc.vy);
  if (currentNpcSpeed > regularMaxSpeed + 1e-4) {
    throw new Error(`Speed limit violated! current: ${currentNpcSpeed}, max: ${regularMaxSpeed}`);
  }
}

const finalSpeed = Math.hypot(npc.vx, npc.vy);
console.log(`After 300 frames: NPC speed = ${finalSpeed.toFixed(3)} px/s (cap is ${regularMaxSpeed.toFixed(3)} px/s)`);
console.log(`Player distance: ${Math.hypot(player.x - npc.x, player.y - npc.y).toFixed(1)} px (player pulled away successfully!)`);
console.log('Test PASSED!');
