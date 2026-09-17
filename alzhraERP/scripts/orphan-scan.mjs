#!/usr/bin/env node
/**
 * orphan-scan.mjs
 * ---------------------------------------------------------------
 * Detects "orphan" source files: files under src/ whose basename
 * is never referenced by ANY other file in src/ (imports, lazy
 * imports, re-exports, dynamic imports, string references).
 *
 * Test files (*.test.*, *.spec.*), ambient declarations (*.d.ts)
 * and stories (*.stories.*) are excluded from the orphan CANDIDATE
 * list (they are discovered by runners, not imported), but their
 * contents are still scanned when looking for usages of others.
 *
 * Usage:  node scripts/orphan-scan.mjs [srcRoot]
 * Exit:   0 always (report tool). Pipe to a file for records.
 * ---------------------------------------------------------------
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), process.argv[2] ?? 'src');

/** Basenames that are entrypoints/ambient and never imported directly. */
const SKIP_BASENAMES = new Set([
  'index', 'main', 'App', 'vite-env', 'setupTests', 'constants',
]);

const CANDIDATE_RE = /\.(tsx?|jsx?)$/;
const EXCLUDED_RE = /(\.test\.tsx?|\.spec\.tsx?|\.d\.ts|\.stories\.tsx?)$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (CANDIDATE_RE.test(entry)) out.push(full);
  }
  return out;
}

const allFiles = walk(SRC_ROOT);
const candidates = allFiles.filter(f => !EXCLUDED_RE.test(f));

/** name -> declaring file (first wins; duplicates listed separately). */
const declared = new Map();
for (const f of candidates) {
  const base = basename(f).replace(/\.(tsx?|jsx?)$/, '');
  if (SKIP_BASENAMES.has(base)) continue;
  if (!declared.has(base)) declared.set(base, f);
}

/** One combined alternation; each file is scanned exactly once. */
const pattern = new RegExp(
  '\\b(' + [...declared.keys()].map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'g'
);

const usedCount = new Map();
const usedBy = new Map();
for (const f of allFiles) {
  const text = readFileSync(f, 'utf8');
  // Dedupe per file: count *files* using a name, not raw occurrences —
  // a file that mentions its own basename twice must not escape detection.
  const found = new Set();
  for (const m of text.matchAll(pattern)) found.add(m[1]);
  for (const n of found) {
    usedCount.set(n, (usedCount.get(n) ?? 0) + 1);
    if (!usedBy.has(n)) usedBy.set(n, f);
  }
}

const orphans = [];
for (const [name, file] of declared) {
  const used = usedCount.get(name) ?? 0;
  const onlySelf = used === 1 && usedBy.get(name) === file;
  if (used === 0 || onlySelf) {
    const kb = (statSync(file).size / 1024).toFixed(1);
    orphans.push({ kb, file: relative(process.cwd(), file).split(sep).join('/') });
  }
}

orphans.sort((a, b) => b.kb - a.kb);
console.log('REAL_ORPHANS: ' + orphans.length);
for (const o of orphans) console.log(o.kb + 'KB ' + o.file);
