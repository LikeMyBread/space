const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const testsDir = __dirname;
const filter = process.argv[2] ? process.argv[2].toLowerCase() : null;

const files = fs.readdirSync(testsDir)
  .filter(f => f.startsWith('test_') && f.endsWith('.js'))
  .filter(f => !filter || f.toLowerCase().includes(filter))
  .sort();

if (files.length === 0) {
  console.log(`No test files found${filter ? ` matching "${filter}"` : ''}.`);
  process.exit(1);
}

console.log(`\n========================================`);
console.log(`Running ${files.length} test suite(s)...`);
console.log(`========================================\n`);

let passed = 0;
let failed = 0;
const startTime = Date.now();

for (const file of files) {
  const filePath = path.join(testsDir, file);
  process.stdout.write(`• ${file} ... `);
  const t0 = Date.now();
  try {
    const output = execFileSync(process.execPath, [filePath], {
      cwd: path.resolve(testsDir, '..'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const duration = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`PASS (${duration}s)`);
    passed++;
  } catch (err) {
    const duration = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`FAIL (${duration}s)\n`);
    console.error(`--- Failure in ${file} ---`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    console.error(err.message);
    console.error('----------------------------\n');
    failed++;
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed (${totalTime}s total)`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
