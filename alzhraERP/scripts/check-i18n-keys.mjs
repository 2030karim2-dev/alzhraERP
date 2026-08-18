/**
 * i18n keys audit — Al-Zahra Smart ERP
 *
 * Scans `src/` for `t('key')` / `t("key")` usages and reports any key that is
 * missing from `ar.json` or `en.json`. Exits non-zero when gaps are found, so it
 * can be wired into CI / pre-push.
 *
 * Usage:
 *   node scripts/check-i18n-keys.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const srcDir = join(root, 'src');
const localesDir = join(root, 'src', 'lib', 'locales');

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function loadLocale(file) {
  try {
    return JSON.parse(readFileSync(join(localesDir, file), 'utf8'));
  } catch (err) {
    console.error(`[i18n] Cannot parse ${file}: ${err.message}`);
    process.exit(1);
  }
}

const ar = loadLocale('ar.json');
const en = loadLocale('en.json');
const usedKeys = new Set();

for (const file of walk(srcDir)) {
  const content = readFileSync(file, 'utf8');
  const re = /\bt\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
}

const missingAr = [...usedKeys].filter(k => !(k in ar)).sort();
const missingEn = [...usedKeys].filter(k => !(k in en)).sort();

console.log(`[i18n] Used keys in src: ${usedKeys.size}`);
console.log(`[i18n] ar.json keys: ${Object.keys(ar).length}`);
console.log(`[i18n] en.json keys: ${Object.keys(en).length}`);
console.log(`[i18n] Missing from ar.json: ${missingAr.length}`);
for (const k of missingAr) console.log(`  - ${k}`);
console.log(`[i18n] Missing from en.json: ${missingEn.length}`);
for (const k of missingEn) console.log(`  - ${k}`);

process.exit(missingAr.length === 0 && missingEn.length === 0 ? 0 : 1);
