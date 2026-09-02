// One-off runner: formats only the files touched by the lint autofix pass.
// Paths come from a list file whose absolute path is passed as argv[2]
// (defaults to <cwd>/.prettier-list.tmp), each line relative to alzhraERP/.
// DELETE this file after use.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const listFileArg = process.argv[2];
const listFile = listFileArg
  ? path.resolve(listFileArg)
  : path.join(process.cwd(), '.prettier-list.tmp');

const list = fs
  .readFileSync(listFile, 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const prettierBin = path.join(process.cwd(), 'node_modules/prettier/bin/prettier.cjs');
let ok = 0;
let failed = 0;

for (let i = 0; i < list.length; i += 50) {
  const chunk = list.slice(i, i + 50);
  try {
    execFileSync(process.execPath, [prettierBin, '--write', '--log-level', 'silent', '--', ...chunk], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
    ok += chunk.length;
  } catch (e) {
    failed += chunk.length;
    console.error(`chunk at ${i} failed: ${e.message}`);
  }
}

console.log(`prettier-runner done: ${ok} formatted, ${failed} failed, total ${list.length}`);
