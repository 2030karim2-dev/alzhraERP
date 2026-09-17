#!/usr/bin/env node
/**
 * Deep file-complexity audit for Al-Zahra Smart ERP.
 *
 * Scans src/**\/*.ts(x), computes structural + complexity metrics per file and
 * emits a prioritised "split candidates" report. Read-only: it never mutates
 * source files.
 *
 * Usage:
 *   node scripts/audit-file-complexity.mjs                 # console priority list
 *   node scripts/audit-file-complexity.mjs --md            # full markdown (stdout)
 *   node scripts/audit-file-complexity.mjs --json          # machine-readable
 *   node scripts/audit-file-complexity.mjs --out <path>    # write markdown to file
 *   node scripts/audit-file-complexity.mjs --min-lines 300 # threshold (default 300)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Generated / vendored files that must never be treated as split candidates. */
const GENERATED = [/database\.types\.ts$/, /\.d\.ts$/];
/** Test files are fixtures, not production code — excluded from refactor targeting. */
const TEST_FILE = /\.(test|spec)\.tsx?$/;
/** Pure constant/data tables: long but structurally trivial. */
const DATA_HEAVY =
  /(presets|constants?|landing\.constants|dhikrList|partPatterns|catalogTextExtractor|\/app\/routes\.tsx$)/i;

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const valueOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const MIN_LINES = Number(valueOf('--min-lines', '300'));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (['.ts', '.tsx'].includes(extname(entry))) out.push(full);
  }
  return out;
}

/** Strip comments + string literals so prose/comments never skew metrics. */
function stripNoise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

const RE = {
  state: /\buseState\s*[<(]/g,
  effect: /\buseEffect\s*\(/g,
  memo: /\buse(Memo|Callback)\s*\(/g,
  query: /\buse(Query|Mutation|QueryClient|InfiniteQuery)\s*[<(]/g,
  hookCall: /\buse[A-Z][A-Za-z0-9]*\s*[<(]/g,
  handlers: /\b(?:const|function)\s+(handle[A-Z][A-Za-z0-9]*)\b/g,
  branch: /\b(?:if|else if|for|while|case|catch)\b|&&|\|\||\?\?|\?\./g,
  anyType: /(?::\s*any\b|<any[,>]|\bas\s+any\b|any\[\])/g,
  supabaseImport: /from\s+['"][^'"]*supabaseClient['"]/,
  exportedDecl: /^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_]+)/gm,
  localComponent: /^(?:const|function)\s+([A-Z][A-Za-z0-9]*)\s*(?:[:=]|\()/gm,
};

function metrics(file) {
  const raw = readFileSync(file, 'utf8');
  const clean = stripNoise(raw);
  const lines = raw.split(/\r?\n/);
  const codeLines = lines.filter(l => l.trim() && !/^\s*(\/\/|\*|\/\*)/.test(l)).length;

  // --- JSX nesting depth (self-closing aware) + tag count
  const tagRe = /<(\/)?([A-Za-z][A-Za-z0-9.]*)((?:"[^"]*"|'[^']*'|\{[^{}]*\}|[^>"'])*?)(\/?)>/g;
  let d = 0;
  let maxTagDepth = 0;
  let jsxTags = 0;
  let m;
  while ((m = tagRe.exec(clean))) {
    jsxTags++;
    if (m[1] === '/') d = Math.max(0, d - 1);
    else if (m[4] !== '/') {
      d++;
      if (d > maxTagDepth) maxTagDepth = d;
    }
  }

  // --- largest brace span, expressed in source lines
  const lineStarts = [];
  {
    let acc = 0;
    for (const l of lines) {
      lineStarts.push(acc);
      acc += l.length + 1;
    }
  }
  const idxOf = pos => {
    for (let i = lineStarts.length - 1; i >= 0; i--) if (lineStarts[i] <= pos) return i;
    return 0;
  };
  let maxBlock = 0;
  let blockStart = 0;
  let blockEnd = 0;
  const stack = [];
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') stack.push(i);
    else if (clean[i] === '}' && stack.length) {
      const start = stack.pop();
      const span = idxOf(i) - idxOf(start);
      if (span > maxBlock) {
        maxBlock = span;
        blockStart = idxOf(start) + 1;
        blockEnd = idxOf(i) + 1;
      }
    }
  }

  const count = re => (clean.match(re) ?? []).length;
  const exportedNames = [...raw.matchAll(RE.exportedDecl)].map(x => x[1]);
  const localNames = [...new Set([...raw.matchAll(RE.localComponent)].map(x => x[1]))];
  const nestedComponents = localNames.filter(
    n => !exportedNames.includes(n) && !raw.includes(`export function ${n}`) && !raw.includes(`export const ${n}`)
  );
  const handlers = [...new Set([...clean.matchAll(RE.handlers)].map(x => x[1]))];

  return {
    file: relative(ROOT, file).split(sep).join('/'),
    lines: lines.length,
    codeLines,
    sizeKb: +(statSync(file).size / 1024).toFixed(1),
    maxTagDepth,
    jsxTags,
    largestBlock: `${blockStart}-${blockEnd} (${maxBlock} lines)`,
    branchPoints: count(RE.branch),
    useState: count(RE.state),
    useEffect: count(RE.effect),
    memo: count(RE.memo),
    reactQuery: count(RE.query),
    hookCalls: count(RE.hookCall),
    handlers: handlers.length,
    nestedComponents: nestedComponents.length,
    nestedComponentNames: nestedComponents.slice(0, 10),
    exportedNames: exportedNames.length,
    anyType: count(RE.anyType),
    touchesSupabase: RE.supabaseImport.test(raw),
    isTest: TEST_FILE.test(file),
    isGenerated: GENERATED.some(r => r.test(file)),
    isDataHeavy: DATA_HEAVY.test(file),
  };
}

const files = walk(SRC).map(metrics);

/** Weighted debt score: size × structure × state × JSX breadth × layering. */
function score(m) {
  const size = m.codeLines / 100;
  const cx = 1 + m.branchPoints / 120;
  const tagCx = 1 + m.maxTagDepth / 10;
  const stateCx = 1 + (m.useState + m.useEffect * 1.5) / 8;
  const jsxCx = 1 + m.jsxTags / 150;
  const nested = 1 + m.nestedComponents / 4;
  const anyPenalty = 1 + m.anyType / 20;
  const layerPenalty = m.touchesSupabase && m.file.includes('/components/') ? 1.5 : 1;
  const dataDiscount = m.isDataHeavy ? 0.6 : 1;
  return +(size * 10 * cx * tagCx * stateCx * jsxCx * nested * anyPenalty * layerPenalty * dataDiscount).toFixed(1);
}

const candidates = files
  .filter(m => !m.isGenerated && !m.isTest && m.lines >= MIN_LINES)
  .map(m => ({ ...m, score: score(m) }))
  .sort((a, b) => b.score - a.score);

const totals = {
  scannedFiles: files.length,
  over300: files.filter(m => m.lines >= 300).length,
  over500: files.filter(m => m.lines >= 500).length,
  over800: files.filter(m => m.lines >= 800).length,
  componentsOverSupabase: files.filter(m => m.touchesSupabase && m.file.includes('/components/')).length,
  totalAnyType: files.reduce((a, m) => a + m.anyType, 0),
  totalLines: files.reduce((a, m) => a + m.lines, 0),
};

/**
 * Percentile tiers — absolute thresholds would drift as the codebase grows, so
 * the worst 10 files are P0, the next 25 P1, the next 40 P2 and the rest P3.
 */
const TIER_CUTS = [10, 25, 40];
const tierOf = i => (i < TIER_CUTS[0] ? 'P0' : i < TIER_CUTS[1] ? 'P1' : i < TIER_CUTS[2] ? 'P2' : 'P3');


if (has('--json')) {
  process.stdout.write(JSON.stringify({ totals, candidates }, null, 2));
} else {
  const rows = candidates
    .map(
      (c, i) =>
        `| ${i + 1} | \`${c.file}\` | ${c.lines} | ${c.codeLines} | ${c.maxTagDepth} | ${c.branchPoints} | ${c.useState}/${c.useEffect} | ${c.nestedComponents} | ${c.anyType} | **${c.score}** | ${tierOf(i)} |`
    )
    .join('\n');
  const head =
    `# تدقيق عمق الملفات الضخمة — Al-Zahra ERP\n\n> أداة القراءة فقط: \`node scripts/audit-file-complexity.mjs\`\n\n` +
    `| المقياس | القيمة |\n|---|---|\n` +
    `| ملفات مفحوصة | ${totals.scannedFiles} |\n` +
    `| إجمالي الأسطر | ${totals.totalLines} |\n` +
    `| ملفات ≥ 300 سطر | ${totals.over300} |\n` +
    `| ملفات ≥ 500 سطر | ${totals.over500} |\n` +
    `| ملفات ≥ 800 سطر | ${totals.over800} |\n` +
    `| مكوّنات (\`.tsx\`) تلمس Supabase مباشرة | ${totals.componentsOverSupabase} |\n` +
    `| إجمالي \`any\` (بعد استثناء الاختبارات) | ${totals.totalAnyType} |\n\n` +
    `> **منهجية الدرجة:** الحجم × كثافة التفرّع × عمق JSX × كثرة الحالة × عدد المكوّنات الداخلية × عقوبة \`any\` × عقوبة كسر الطبقات (÷ خصم للملفات الثابتة/البيانات).\n\n`;
  const table = `## مرشحو التقسيم (مرتّبون بالأولوية)\n\n| # | الملف | أسطر | أسطر كود | عمق JSX | نقاط تفرّع | state/effect | مكوّنات داخلية | any | الدرجة | التصنيف |\n|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|---|\n${rows}\n`;
  const detail =
    `\n## تفصيل أهم 15 ملفاً\n\n` +
    candidates
      .slice(0, 15)
      .map(
        (c, i) =>
          `### ${i + 1}. \`${c.file}\`\n` +
          `- الحجم: **${c.lines} سطر** / ${c.sizeKb}KB — أسطر كود: ${c.codeLines}\n` +
          `- أكبر كتلة: ${c.largestBlock} — وسوم JSX: ${c.jsxTags} — أقصى عمق JSX: ${c.maxTagDepth}\n` +
          `- الحالة: ${c.useState} \`useState\`، ${c.useEffect} \`useEffect\`، ${c.memo} memo، ${c.reactQuery} React Query، ${c.hookCalls} نداء hook\n` +
          `- معالجات أحداث: ${c.handlers} — مكوّنات داخلية غير مُصدَّرة: ${c.nestedComponents}${c.nestedComponentNames.length ? ` (\`${c.nestedComponentNames.join('`, `')}\`)` : ''}\n` +
          `- تصديرات عامة: ${c.exportedNames} — \`any\`: ${c.anyType} — Supabase مباشر: ${c.touchesSupabase ? '**نعم (كسر طبقات)**' : 'لا'} — ملف بيانات/ثوابت: ${c.isDataHeavy ? 'نعم' : 'لا'}\n` +
          `- الدرجة: **${c.score}** (${tierOf(i)})\n`
      )
      .join('\n');
  const out = head + table + detail;
  const target = valueOf('--out', null);
  if (target) {
    writeFileSync(join(ROOT, target), out, 'utf8');
    process.stdout.write(`✔ تم كتابة التقرير في ${target}\n`);
  } else if (has('--md')) {
    process.stdout.write(out);
  } else {
    process.stdout.write(
      `فحص ${totals.scannedFiles} ملف — ${totals.over300} ملف ≥300 سطر، ${totals.over500} ≥500، ${totals.over800} ≥800\n\n`
    );
    for (const [i, c] of candidates.slice(0, 40).entries()) {
      process.stdout.write(
        `${String(i + 1).padStart(2)}. ${String(c.lines).padStart(4)} سطر  deep=${String(c.maxTagDepth).padStart(2)}  br=${String(c.branchPoints).padStart(3)}  st=${String(c.useState).padStart(2)}  score=${String(c.score).padStart(6)}  ${tierOf(i)}  ${c.file}\n`
      );
    }
    process.stdout.write(`\n--md للتقرير الكامل، --json للتحليل الآلي، --out <path> للحفظ.\n`);
  }
}
