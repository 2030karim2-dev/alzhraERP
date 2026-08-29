#!/usr/bin/env node
// حارس الحد الأدنى لأحجام الخطوط:
// يرفض أي text-[1-9px] في src/ (يمنع عودة الخطوط الدقيقة على الموبايل حصراً)
// الاستخدام: npm run check:fonts — يخرج 1 عند وجود مخالفات (جاهز للـ CI/pre-push)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const RE = /\btext-\[[1-9]px\]/g;
const hits = new Set();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!/\.(tsx|ts)$/.test(entry.name)) continue;
    const src = fs.readFileSync(p, 'utf8');
    src.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(RE)) {
        const ctx = line.slice(Math.max(0, m.index - 40), (m.index ?? 0) + 40).trim();
        hits.add(`${path.relative(process.cwd(), p)}:${i + 1}  [${m[0]}]  …${ctx}…`);
      }
    });
  }
}
walk(ROOT + '/src');

if (hits.size > 0) {
  console.error(`❌ Tiny font-sizes found (min is ${'text-[10px]'}): ${hits.size}`);
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log('✅ No sub-10px font sizes in src/');