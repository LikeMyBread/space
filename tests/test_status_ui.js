const path = require('path');
const fs = require('fs');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// Check elements exist in HTML
const requiredIds = [
  'player-status-panel',
  'player-status-badge',
  'shield-val',
  'shield-bar',
  'armor-val',
  'armor-bar',
  'energy-val',
  'energy-bar',
  'fuel-val',
  'fuel-segments-container',
  'status-hull-name',
  'status-engine-name',
  'status-speed-val',
  'status-mass-val',
];

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`Missing expected element id="${id}" in index.html`);
  }
}

// Check layout order in HTML: player-status-panel then game-container then sidebar-panel
const posStatus = html.indexOf('id="player-status-panel"');
const posGame = html.indexOf('id="game-container"');
const posSidebar = html.indexOf('id="sidebar-panel"');

if (posStatus === -1 || posGame === -1 || posSidebar === -1) {
  throw new Error('Missing one of the main panels');
}

if (!(posStatus < posGame && posGame < posSidebar)) {
  throw new Error(`Panels not in expected order! posStatus=${posStatus}, posGame=${posGame}, posSidebar=${posSidebar}`);
}

console.log('HTML layout verification passed: Status Panel (Left) -> Game Container (Center) -> Sidebar (Right)');
