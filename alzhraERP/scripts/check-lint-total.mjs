#!/usr/bin/env node
// check-lint-total.mjs
// -----------------------------------------------------------------
// Global lint-debt CEILING gate (companion to check-lint-ratchet.mjs).
//
// The per-file ratchet (check-lint-ratchet.mjs) blocks new debt in
// changed files, and new files default to a zero-error baseline. But
// `--update` can still raise a single file's allowance, letting total
// debt creep upward silently (this is exactly how the baseline drifted
// from 8928 to 10482+ between seeds). This gate pins the AGGREGATE
// error count: any increase above scripts/lint-total-baseline.json
// fails the run.
//
// When you pay down debt, lower the numbers in the JSON in the same
// commit to lock in the progress.
//
// Run:  node scripts/check-lint-total.mjs
// Exit: 1 if total eslint errors exceed the baseline, 0 otherwise.
//
// NOTE: kept pure ASCII so the encoding guard never flags it.
// -----------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const BASELINE_PATH = path.join(HERE, 'lint-total-baseline.json');
const ESLINT_BIN = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
} catch {
  console.error('[lint-total] FAILED: lint-total-baseline.json is missing or invalid.');
  process.exit(1);
}
if (typeof baseline.errors !== 'number') {
  console.error('[lint-total] FAILED: lint-total-baseline.json must contain a numeric "errors" field.');
  process.exit(1);
}

console.log('[lint-total] Running full eslint scan (can take several minutes)...');

const res = spawnSync(
  process.execPath,
  [ESLINT_BIN, '.', '--report-unused-disable-directives', '--format', 'json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
);

let results;
try {
  results = JSON.parse(res.stdout || '[]');
} catch {
  console.error('[lint-total] FAILED: eslint produced no parseable JSON report.');
  if (res.error) console.error(res.error.message);
  const tail = (res.stderr || '').split(/\r?\n/).slice(-20).join('\n');
  if (tail) console.error(tail);
  process.exit(1);
}

let errors = 0;
let warnings = 0;
for (const r of results) {
  errors += r.errorCount || 0;
  warnings += r.warningCount || 0;
}

const bE = baseline.errors;
const bW = baseline.warnings ?? 0;

if (errors > bE) {
  console.error(`[lint-total] FAILED: ${errors} eslint errors (baseline ${bE}, +${errors - bE} NEW).`);
  console.error('[lint-total] New lint debt is not allowed. Fix it instead of raising the baseline.');
  process.exit(1);
}

if (errors < bE) {
  console.log(`[lint-total] Progress: errors dropped ${bE} -> ${errors} (-${bE - errors}).`);
  console.log('[lint-total] Lower "errors" in lint-total-baseline.json in the same commit to lock it in.');
}

console.log(`[lint-total] OK: ${errors} errors, ${warnings} warnings (baseline ${bE}/${bW}). No new debt.`);
