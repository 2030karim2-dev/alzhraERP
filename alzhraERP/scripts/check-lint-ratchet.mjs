#!/usr/bin/env node
// حارس دين الـ lint المتدرج (ratchet) — نفس فلسفة check-ts-baseline.ts
//
// الوضع الافتراضي: يفحص ملفات TS/TSX المتغيرة في آخر commit (أو الممررة عبر --files=)
// ويقارن عدد أخطاء ESLint الحالية بالخط الأساسي (lint-baseline.json).
// يمنع نمو الدين الجديد دون أن يحاصر الدين البنيوي القديم المسجَّل.
//
// الاستخدام:
//   node scripts/check-lint-ratchet.mjs                       # git diff HEAD~1..HEAD
//   node scripts/check-lint-ratchet.mjs --files="a.ts b.tsx"  # ملفات محددة (CI)
//   node scripts/check-lint-ratchet.mjs --seed-all            # يعيد بناء الأساس لكل src
//   node scripts/check-lint-ratchet.mjs --update              # يحدّث الأساس بعد سداد دين مقصود
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const BASELINE_PATH = path.join(HERE, 'lint-baseline.json');

const readBaseline = () => {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return {};
  }
};

const writeBaseline = b => {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(b, null, 2) + '\n');
};

const runEslint = files => {
  const res = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js'), ...files, '--format', 'json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const out = res.stdout || '';
  let results = [];
  try {
    results = JSON.parse(out);
  } catch {
    // لا ينتج JSON صالح دائماً عند أخطاء خارج الملفات — نتعامل مع كل ملف على حدة أدناه
    for (const f of files) {
      const single = spawnSync(
        process.execPath,
        [path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js'), f, '--format', 'json'],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
      );
      try {
        results.push(...JSON.parse(single.stdout || '[]'));
      } catch {
        results.push({
          filePath: path.resolve(ROOT, f),
          errorCount: 999,
          messages: [{ message: 'eslint failed to run', severity: 2, ruleId: null }],
        });
      }
    }
  }
  return results;
};

const rel = p => path.relative(ROOT, p).split(path.sep).join('/');

if (process.argv.includes('--seed-all')) {
  // يعيد بناء الأساس لكل الملفات مرة واحدة (خطوة تهيئة/سداد دين).
  const allFiles = execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
  const results = runEslint(allFiles);
  const baseline = {};
  for (const r of results) baseline[rel(r.filePath)] = r.errorCount || 0;
  writeBaseline(baseline);
  console.log(
    `[lint-ratchet] Seeded baseline: ${Object.keys(baseline).length} files, ${Object.values(baseline).reduce((a, b) => a + b, 0)} total errors.`
  );
  process.exit(0);
}

// تحديد الملفات المتغيرة
let files;
const filesFlag = process.argv.find(a => a.startsWith('--files='));
if (filesFlag) {
  files = filesFlag
    .slice(8)
    .split(/[\s,]+/)
    .filter(Boolean);
} else {
  try {
    const changed = execFileSync(
      'git',
      ['diff', '--name-only', 'HEAD~1', 'HEAD', '--', '*.ts', '*.tsx'],
      { cwd: ROOT, encoding: 'utf8' }
    )
      .split('\n')
      .filter(Boolean);
    files = changed;
  } catch {
    // أول commit أو لا أصل تاريخي — لا شيء للمقارنة به.
    console.log('[lint-ratchet] No base commit to diff against — skipping.');
    process.exit(0);
  }
}

files = files.filter(f => /\.(ts|tsx)$/.test(f));

// `--seed-all`: rebuild the ENTIRE baseline from the current src/ state.
// Documented in the header but was never implemented — add it so the ratchet
// can be re-seeded after large autofix passes (fixes "guard doesn't cover
// every file" gap). Collects every .ts/.tsx under src/ and takes the --update
// write path.
if (process.argv.includes('--seed-all')) {
  const srcRoot = path.join(ROOT, 'src');
  try {
    const all = [];
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(ent.name)) all.push(p);
      }
    };
    walk(srcRoot);
    files = all;
    console.log(`[lint-ratchet] --seed-all: rebuilding baseline for ${files.length} source files...`);
    process.argv.push('--update');
  } catch (e) {
    console.error('[lint-ratchet] --seed-all failed to walk src/:', e.message);
    process.exit(1);
  }
}

if (files.length === 0) {
  console.log('[lint-ratchet] No changed TS/TSX files.');
  process.exit(0);
}

const baseline = readBaseline();
const results = runEslint(files);

if (process.argv.includes('--update')) {
  for (const r of results) baseline[rel(r.filePath)] = r.errorCount || 0;
  writeBaseline(baseline);
  console.log(`[lint-ratchet] Baseline updated. ${results.length} files recorded.`);
  process.exit(0);
}

let failed = false;
for (const r of results) {
  const key = rel(r.filePath);
  const prev = baseline[key] ?? 0;
  const now = r.errorCount || 0;
  if (now > prev) {
    failed = true;
    console.error(`❌ ${key}: ${now} errors (baseline ${prev}) — new lint debt introduced.`);
    for (const m of (r.messages || []).filter(m => m.severity === 2)) {
      console.error(`   ${m.line}:${m.column}  ${m.ruleId}  ${m.message}`);
    }
  } else {
    console.log(`✓ ${key}: ${now} errors (baseline ${prev})`);
  }
}

if (failed) {
  console.error(
    '[lint-ratchet] FAILED: new lint debt detected. Fix it, or run --update ONLY when debt is intentionally paid down.'
  );
  process.exit(1);
}
console.log(`[lint-ratchet] OK: all ${results.length} changed files within lint baseline.`);
