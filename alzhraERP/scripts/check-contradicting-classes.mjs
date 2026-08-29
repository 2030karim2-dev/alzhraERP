#!/usr/bin/env node
// حارس الكلاسات المتنازعة (Tailwind): يكشف داخل نص className واحد فقط
// نفس variant+utility بقيمتين مختلفتين (مثال: "p-4 max-md:p-3 max-md:p-4").
// فروع ternary / استدعاءات cn() على نفس السطر ليست تعارضاً — تُفحص النصوص منفصلة.
// الاستخدام: npm run check:classes   (خروج 1 عند وجود تعارضات — جاهز للـ CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', 'src');

// الترتيب مهم: الأطول أولاً حتى لا يلتهم p البادئة px
const TOKEN_RE = /(?:max-md|md|sm|lg|xl|2xl):(px|py|pt|pb|ps|pe|p|mx|my|mt|mb|ms|me|m|gap-x|gap-y|gap)-([^\s"'`]+)/g;
const conflicts = new Set();

function checkLiteral(lit, loc) {
  const groups = new Map();
  for (const m of lit.matchAll(TOKEN_RE)) {
    const key = m[0].slice(0, m[0].length - m[2].length); // variant+utility-
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(m[2]);
  }
  for (const [key, vals] of groups) {
    if (vals.size > 1) conflicts.add(`${loc} -> ${key}[${[...vals].join(' | ')}]`);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!/\.(tsx|ts)$/.test(entry.name)) continue;
    const rel = path.relative(path.join(HERE, '..'), p);
    const src = fs.readFileSync(p, 'utf8');
    // نصوص "..." و '...' (سطر واحد)
    src.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/"([^"\n]*)"/g)) checkLiteral(m[1], `${rel}:${i + 1}`);
      for (const m of line.matchAll(/'([^'\n]*)'/g)) checkLiteral(m[1], `${rel}:${i + 1}`);
    });
    // قوالب `...` متعددة الأسطر — نتجاوز تعابير ${...}
    for (const m of src.matchAll(/`[\s\S]*?`/g)) {
      const lineNo = src.slice(0, m.index ?? 0).split('\n').length;
      const frags = m[0].split(/(\$\{[^}]*\})/g).filter((_, i) => i % 2 === 0);
      for (const f of frags) checkLiteral(f, `${rel}:${lineNo}`);
    }
  }
}

walk(ROOT);
if (conflicts.size > 0) {
  console.error(`❌ Contradicting spacing classes: ${conflicts.size}`);
  for (const c of conflicts) console.error('  ' + c);
  process.exit(1);
}
console.log('✅ No contradicting spacing classes in src/');
