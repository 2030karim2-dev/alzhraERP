#!/usr/bin/env node
// Seed/Rebuild لـ lint-baseline.json — متوازٍ ومتين.
// يقسّم ملفات TS/TSX إلى دفعات ويشغّل eslint لكل دفعة في عملية مستقلة
// (3 قنوات متزامنة) ثم يدمج النتائج في lint-baseline.json.
// الاستخدام: node scripts/seed-lint-baseline.mjs [--chunk=60] [--workers=3]
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const BASELINE_PATH = path.join(HERE, 'lint-baseline.json');
const ESLINT_BIN = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

const chunkSize = Number(process.argv.find((a) => a.startsWith('--chunk='))?.split('=')[1] || 60);
const workers = Number(process.argv.find((a) => a.startsWith('--workers='))?.split('=')[1] || 3);

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

const files = execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

const chunks = [];
for (let i = 0; i < files.length; i += chunkSize) chunks.push(files.slice(i, i + chunkSize));

const baseline = {};
let done = 0;
const total = chunks.length;

async function runEslintChunk(chunk) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [ESLINT_BIN, ...chunk, '--format', 'json'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', () => resolve({ results: [] }));
    child.on('close', (_code) => {
      if (stderr) process.stderr.write(stderr.slice(0, 2000));
      let results = [];
      try {
        results = JSON.parse(stdout || '[]');
      } catch { /* ignore — treat chunk as no-op */ }
      resolve({ results });
    });
  });
}

async function workerPool() {
  const queue = [...chunks];
  const run = async () => {
    while (queue.length) {
      const chunk = queue.shift();
      const { results } = await runEslintChunk(chunk);
      for (const r of results) baseline[rel(r.filePath)] = r.errorCount || 0;
      done += 1;
      process.stderr.write(`\r[seed-lint] chunks done: ${done}/${total}`);
    }
  };
  await Promise.all(Array.from({ length: workers }, run));
}

await workerPool();
writeBaseline();

function writeBaseline() {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  const totalErrors = Object.values(baseline).reduce((a, b) => a + b, 0);
  console.log(`\n[seed-lint] Baseline written: ${Object.keys(baseline).length} files, ${totalErrors} total errors.`);
}

// Guard: file must be valid JSON for the ratchet step.