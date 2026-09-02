// One-off runner: formats only the files touched by the lint autofix pass.
// Paths are read from .prettier-list.tmp (relative to alzhraERP/).
// DELETE this file after use.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const list = fs
  .readFileSync('.prettier-list.tmp', 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const prettierBin = 'node_modules/prettier/bin/prettier.cjs';
let ok = 0;
let failed = 0;

for (let i = 0; i < list.length; i += 50) {
  const chunk = list.slice(i, i + 50);
  try {
    execFileSync(process.execPath, [prettierBin, '--write', '--log-level', 'silent', '--', ...chunk], {
      stdio: 'ignore',
    });
    ok += chunk.length;
  } catch (e) {
    failed += chunk.length;
    console.error(`chunk at ${i} failed: ${e.message}`);
  }
}

console.log(`prettier-runner done: ${ok} formatted, ${failed} failed, total ${list.length}`);
