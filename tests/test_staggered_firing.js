const path = require('path');
function getShipWeaponGroups(ship) {
  if (!ship.data.weapons || ship.data.weapons.length === 0) return [];
  if (ship.data.weaponGroups && ship.data._weaponsRef === ship.data.weapons) {
    return ship.data.weaponGroups;
  }

  const groupMap = new Map();
  for (const slot of ship.data.weapons) {
    const key = slot.weapon.name || slot.weapon.img;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        weapon: slot.weapon,
        slots: [],
        lastFired: -Infinity,
        nextIndex: 0,
      });
    }
    groupMap.get(key).slots.push(slot);
  }

  ship.data.weaponGroups = Array.from(groupMap.values());
  ship.data._weaponsRef = ship.data.weapons;
  return ship.data.weaponGroups;
}

function fireShipWeapons(ship, now, firedLog) {
  const groups = getShipWeaponGroups(ship);
  if (!groups || groups.length === 0) return;

  for (const group of groups) {
    const count = group.slots.length;
    if (count === 0) continue;

    const cooldownMs = 1000 / group.weapon.fireRate;
    const staggerInterval = cooldownMs / count;

    // If the weapon group has been idle for at least a full weapon cooldown,
    // reset to the first weapon so it fires immediately upon engaging weapons.
    if (now - group.lastFired >= cooldownMs) {
      group.nextIndex = 0;
    }

    // Check if the stagger interval has passed since the group last fired
    if (now - group.lastFired >= staggerInterval) {
      const slot = group.slots[group.nextIndex];
      // Verify that this individual weapon slot has cooled down
      if (now - slot.lastFired >= cooldownMs) {
        slot.lastFired = now;
        group.lastFired = now;
        const firedIndex = group.nextIndex;
        group.nextIndex = (group.nextIndex + 1) % count;
        firedLog.push({ time: now, slotIndex: firedIndex, hardpoint: slot.hardpoint });
      }
    }
  }
}

// TEST 1: Two blasters firing continuously for 2000 ms at 60 FPS
const weapon = {
  name: 'Light Blaster',
  fireRate: 2, // 2 shots/sec -> 500 ms cooldown
};

const twoWeaponShip = {
  data: {
    weapons: [
      { weapon, hardpoint: { location: { x: 12, y: 8 } }, lastFired: -Infinity },
      { weapon, hardpoint: { location: { x: 20, y: 8 } }, lastFired: -Infinity },
    ]
  }
};

let firedLog = [];
let simTime = 1000;
const dt = 1000 / 60; // ~16.67ms

for (let i = 0; i < 120; i++) { // 2 seconds
  fireShipWeapons(twoWeaponShip, simTime, firedLog);
  simTime += dt;
}

console.log('--- TEST 1: Continuous fire with 2 blasters (500ms cooldown, 250ms stagger) ---');
firedLog.forEach((f, i) => {
  const prevTime = i > 0 ? firedLog[i - 1].time : f.time;
  const delta = (f.time - prevTime).toFixed(1);
  console.log(`Shot ${i+1}: time=${f.time.toFixed(1)}ms, slot=${f.slotIndex}, deltaFromPrev=${delta}ms`);
});

// Verify alternation and spacing
for (let i = 0; i < firedLog.length; i++) {
  if (i % 2 !== firedLog[i].slotIndex) {
    throw new Error(`Expected slot ${i % 2} at shot ${i}, got ${firedLog[i].slotIndex}`);
  }
  if (i > 0) {
    const diff = firedLog[i].time - firedLog[i - 1].time;
    if (diff < 240 || diff > 270) {
      throw new Error(`Expected ~250ms spacing, got ${diff}ms`);
    }
  }
}
console.log('TEST 1 PASSED: Perfect alternation (0, 1, 0, 1...) with ~250ms spacing!');

// TEST 2: Three blasters (500ms cooldown, 166.7ms stagger)
const threeWeaponShip = {
  data: {
    weapons: [
      { weapon, hardpoint: { location: { x: 10, y: 8 } }, lastFired: -Infinity },
      { weapon, hardpoint: { location: { x: 15, y: 8 } }, lastFired: -Infinity },
      { weapon, hardpoint: { location: { x: 20, y: 8 } }, lastFired: -Infinity },
    ]
  }
};

firedLog = [];
simTime = 1000;
for (let i = 0; i < 120; i++) {
  fireShipWeapons(threeWeaponShip, simTime, firedLog);
  simTime += dt;
}

console.log('\n--- TEST 2: Continuous fire with 3 blasters (500ms cooldown, 166.7ms stagger) ---');
firedLog.forEach((f, i) => {
  const prevTime = i > 0 ? firedLog[i - 1].time : f.time;
  const delta = (f.time - prevTime).toFixed(1);
  console.log(`Shot ${i+1}: time=${f.time.toFixed(1)}ms, slot=${f.slotIndex}, deltaFromPrev=${delta}ms`);
});

for (let i = 0; i < firedLog.length; i++) {
  if (i % 3 !== firedLog[i].slotIndex) {
    throw new Error(`Expected slot ${i % 3} at shot ${i}, got ${firedLog[i].slotIndex}`);
  }
  if (i > 0) {
    const diff = firedLog[i].time - firedLog[i - 1].time;
    if (diff < 160 || diff > 185) {
      throw new Error(`Expected ~166.7ms spacing, got ${diff}ms`);
    }
  }
}
console.log('TEST 2 PASSED: Perfect alternation (0, 1, 2, 0, 1, 2...) with ~166.7ms spacing!');

// TEST 3: Pause and re-fire test
console.log('\n--- TEST 3: Pause and re-fire with 2 blasters ---');
const test3Ship = {
  data: {
    weapons: [
      { weapon, hardpoint: { location: { x: 12, y: 8 } }, lastFired: -Infinity },
      { weapon, hardpoint: { location: { x: 20, y: 8 } }, lastFired: -Infinity },
    ]
  }
};
firedLog = [];

// Fire at t=1000 (single frame tap)
fireShipWeapons(test3Ship, 1000, firedLog);
if (firedLog.length !== 1 || firedLog[0].slotIndex !== 0) {
  throw new Error('Expected slot 0 to fire immediately at t=1000');
}
console.log('Shot 1 fired at t=1000: slot 0 (immediate)');

// Try firing at t=1150 (only 150ms later) -> should NOT fire
fireShipWeapons(test3Ship, 1150, firedLog);
if (firedLog.length !== 1) {
  throw new Error('Should not fire at 1150 (less than 250ms)');
}
console.log('At t=1150ms: slot 1 held back as expected');

// Fire at t=1250 (250ms later) -> slot 1 should fire!
fireShipWeapons(test3Ship, 1250, firedLog);
if (firedLog.length !== 2 || firedLog[1].slotIndex !== 1) {
  throw new Error('Expected slot 1 to fire at t=1250');
}
console.log('Shot 2 fired at t=1250: slot 1 (exactly half delay later)');

// Pause for 3000ms until t=4250 (idle)
// Fire at t=4250 -> slot 0 should fire immediately!
fireShipWeapons(test3Ship, 4250, firedLog);
if (firedLog.length !== 3 || firedLog[2].slotIndex !== 0) {
  throw new Error('Expected slot 0 to fire immediately upon re-engaging after idle');
}
console.log('Shot 3 fired at t=4250: slot 0 (first weapon reset immediately upon re-engaging)');

// Next frame at t=4266 -> should NOT fire
fireShipWeapons(test3Ship, 4266, firedLog);
if (firedLog.length !== 3) {
  throw new Error('Should not fire at 4266');
}

// At t=4500 (250ms after 4250) -> slot 1 should fire!
fireShipWeapons(test3Ship, 4500, firedLog);
if (firedLog.length !== 4 || firedLog[3].slotIndex !== 1) {
  throw new Error('Expected slot 1 to fire at t=4500');
}
console.log('Shot 4 fired at t=4500: slot 1 (half delay later)');

console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
