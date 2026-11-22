'use strict';

const path = require('path');
const assert = require('assert');
const fs = require('fs');

console.log('--- Testing Data Refactoring & Modular Data Architecture ---');

// 1. Directory and file structure
const dataDir = path.resolve(__dirname, '../data');
assert(fs.existsSync(dataDir) && fs.statSync(dataDir).isDirectory(), 'data/ folder must exist');

const expectedFiles = [
  'constants.js',
  'keybindings.js',
  'hulls.js',
  'engines.js',
  'weapons.js',
  'planets.js',
  'paints.js',
  'assets.js',
  'index.js',
];

for (const file of expectedFiles) {
  const filePath = path.join(dataDir, file);
  assert(fs.existsSync(filePath), `data/${file} must exist`);
}
console.log('✓ All expected data files exist in data/ folder');

// 2. Test constants.js
const constantsModule = require('../data/constants.js');
assert(constantsModule.CONSTANTS, 'constants.js must export CONSTANTS object');
assert.strictEqual(constantsModule.ACCEL_LIMIT, 5, 'ACCEL_LIMIT must equal 5');
assert.strictEqual(constantsModule.GAME_WIDTH, 1000, 'GAME_WIDTH must equal 1000');
assert.strictEqual(constantsModule.GAME_HEIGHT, 600, 'GAME_HEIGHT must equal 600');
assert.strictEqual(constantsModule.DISABLED_ARMOR_THRESHOLD, 0.2, 'DISABLED_ARMOR_THRESHOLD must equal 0.2');
assert.strictEqual(constantsModule.DEFAULT_SHIELD_REGEN_RATE, 0.5, 'DEFAULT_SHIELD_REGEN_RATE must equal 0.5');
assert.strictEqual(constantsModule.LANDING_SPEED_LIMIT, 10, 'LANDING_SPEED_LIMIT must equal 10');
assert.deepStrictEqual(constantsModule.RADAR_RINGS, [500, 1000, 2000, 4000], 'RADAR_RINGS must match expected distances');
assert.strictEqual(constantsModule.HEX_DIRECTIONS.length, 6, 'HEX_DIRECTIONS must contain 6 axial directions');
console.log('✓ data/constants.js exports universal constants and magic numbers correctly');

// 3. Test keybindings.js
const keybindingsModule = require('../data/keybindings.js');
const { DEFAULT_KEYBINDINGS, GAME_KEYS, isBindingPressed, isEventMatch } = keybindingsModule;

assert(DEFAULT_KEYBINDINGS, 'DEFAULT_KEYBINDINGS must be exported');
const expectedActions = ['thrust', 'reverse', 'turnLeft', 'turnRight', 'fire', 'cycleTarget', 'selectNearestHostile', 'land', 'pause'];
for (const action of expectedActions) {
  assert(DEFAULT_KEYBINDINGS[action], `DEFAULT_KEYBINDINGS must define action "${action}"`);
  assert(Array.isArray(DEFAULT_KEYBINDINGS[action].keys), `Action "${action}" must define keys array`);
  assert(Array.isArray(DEFAULT_KEYBINDINGS[action].keyCodes), `Action "${action}" must define keyCodes array`);
}

assert(GAME_KEYS instanceof Set, 'GAME_KEYS must be a Set');
assert(GAME_KEYS.has('ArrowUp') && GAME_KEYS.has('Space') && GAME_KEYS.has('ArrowLeft'), 'GAME_KEYS must include primary game keys');
assert(!GAME_KEYS.has('KeyW') && !GAME_KEYS.has('KeyA') && !GAME_KEYS.has('KeyS') && !GAME_KEYS.has('KeyD'), 'GAME_KEYS must not include WASD');

// Test input helpers
assert(isBindingPressed(DEFAULT_KEYBINDINGS.thrust, { ArrowUp: true }), 'isBindingPressed should match ArrowUp');
assert(isBindingPressed(DEFAULT_KEYBINDINGS.thrust, { 38: true }), 'isBindingPressed should match keyCode 38 in keyState');
assert(!isBindingPressed(DEFAULT_KEYBINDINGS.thrust, { KeyW: true }), 'isBindingPressed should not match removed KeyW');
assert(!isBindingPressed(DEFAULT_KEYBINDINGS.thrust, { 87: true }), 'isBindingPressed should not match removed keyCode 87');
assert(!isBindingPressed(DEFAULT_KEYBINDINGS.thrust, { KeyK: true }), 'isBindingPressed should return false for unbound key');
assert(isEventMatch(DEFAULT_KEYBINDINGS.land, { code: 'KeyL', key: 'l', keyCode: 76 }), 'isEventMatch should match landing event');
assert(isEventMatch(DEFAULT_KEYBINDINGS.pause, { code: 'Escape', key: 'escape', keyCode: 27 }), 'isEventMatch should match pause event');
console.log('✓ data/keybindings.js exports default keybindings and input matchers');

// 4. Test hulls.js
const hullsModule = require('../data/hulls.js');
const { HULLS_DATA } = hullsModule;
assert(Array.isArray(HULLS_DATA), 'HULLS_DATA must be an array');
assert.strictEqual(HULLS_DATA.length, 10, 'HULLS_DATA must contain all 10 ship hulls');

const hullNames = HULLS_DATA.map((h) => h.name);
const expectedHulls = ['Anvil', 'Avocado', 'Boat', 'Crab', 'Delta', 'Hammer', 'Protogon', 'Shadow', 'Shuttle', 'Skate'];
assert.deepStrictEqual(hullNames.sort(), expectedHulls.sort(), 'All 10 expected hulls must be present');

const shadowHull = HULLS_DATA.find((h) => h.name === 'Shadow');
const boatHull = HULLS_DATA.find((h) => h.name === 'Boat');
const hammerHull = HULLS_DATA.find((h) => h.name === 'Hammer');
assert.strictEqual(shadowHull.engine_mounts.length, 2, 'Shadow must have 2 engine mounts');
assert.strictEqual(boatHull.engine_mounts.length, 2, 'Boat must have 2 engine mounts');
assert.strictEqual(hammerHull.armor, 100, 'Hammer must have 100 armor');
assert.strictEqual(boatHull.armor, 40, 'Boat must have 40 armor');
console.log('✓ data/hulls.js exports complete hull specifications');

// 5. Test engines.js
const enginesModule = require('../data/engines.js');
const { ENGINES_DATA } = enginesModule;
assert(Array.isArray(ENGINES_DATA), 'ENGINES_DATA must be an array');
assert.strictEqual(ENGINES_DATA.length, 2, 'ENGINES_DATA must contain 2 engines');
const thruster = ENGINES_DATA.find((e) => e.name === 'thruster');
const turbo = ENGINES_DATA.find((e) => e.name === 'turbo_thruster');
assert(thruster && thruster.reversible === true && thruster.thrust === 50, 'Standard thruster must be reversible with 50 kN thrust');
assert(turbo && turbo.reversible === false && turbo.thrust === 100, 'Turbo thruster must be non-reversible with 100 kN thrust');
console.log('✓ data/engines.js exports engine specifications');

// 6. Test weapons.js
const weaponsModule = require('../data/weapons.js');
const { WEAPONS_DATA } = weaponsModule;
assert(WEAPONS_DATA && WEAPONS_DATA.light_blaster, 'WEAPONS_DATA must define light_blaster');
assert.strictEqual(WEAPONS_DATA.light_blaster.projectile.speed, 100, 'Light blaster speed must be 100');
assert.strictEqual(WEAPONS_DATA.light_blaster.projectile.lifetime, 0.875, 'Light blaster lifetime must be 0.875');
console.log('✓ data/weapons.js exports weapon specifications');

// 7. Test planets.js
const planetsModule = require('../data/planets.js');
const { PLANETS_DATA } = planetsModule;
assert(Array.isArray(PLANETS_DATA) && PLANETS_DATA.length === 3, 'PLANETS_DATA must contain 3 planets');
for (const p of PLANETS_DATA) {
  assert(p.name && p.description && p.radius === 100 && p.img, `Planet ${p.name} must have name, description, radius, and image`);
  assert(/\b(you|your|You|Your)\b/.test(p.description), `Planet ${p.name} description must be in second person`);
}
console.log('✓ data/planets.js exports planetary data and second-person descriptions');

// 8. Test paints.js
const paintsModule = require('../data/paints.js');
const { FACTION_PAINTS } = paintsModule;
assert(Array.isArray(FACTION_PAINTS) && FACTION_PAINTS.length === 8, 'FACTION_PAINTS must contain 8 factions');
console.log('✓ data/paints.js exports faction paint schemes');

// 9. Test assets.js
const assetsModule = require('../data/assets.js');
const { ASSET_PATHS } = assetsModule;
assert(Array.isArray(ASSET_PATHS) && ASSET_PATHS.length >= 21, 'ASSET_PATHS must contain all 21 game assets');
console.log('✓ data/assets.js exports static asset paths');

// 10. Test unified index.js
const allData = require('../data/index.js');
assert(allData.HULLS_DATA && allData.ENGINES_DATA && allData.WEAPONS_DATA && allData.PLANETS_DATA, 'data/index.js must aggregate all datasets');
assert(allData.CONSTANTS && allData.DEFAULT_KEYBINDINGS, 'data/index.js must aggregate constants and keybindings');
console.log('✓ data/index.js unified re-export works correctly');

// 11. Test index.html script inclusion
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const scriptOrder = [
  'data/constants.js',
  'data/keybindings.js',
  'data/weapons.js',
  'data/hulls.js',
  'data/engines.js',
  'data/planets.js',
  'data/paints.js',
  'data/assets.js',
  'main.js',
];

let lastPos = -1;
for (const script of scriptOrder) {
  const pos = html.indexOf(script);
  assert(pos !== -1, `index.html must include script tag for ${script}`);
  assert(pos > lastPos, `Scripts in index.html must maintain dependency order: ${script}`);
  lastPos = pos;
}
console.log('✓ index.html includes all modular data scripts in correct dependency order');

console.log('\n--- All Data Refactoring tests passed! ---');
