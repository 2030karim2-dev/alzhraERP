#!/usr/bin/env node
/**
 * Layer-boundary guard (AGENTS.md / .clinerules — MANDATORY architecture):
 *
 *   Component → Hook → Service → API → Supabase
 *
 * React components (.tsx) must NEVER import the Supabase runtime client
 * directly — data access belongs in feature services/APIs so RLS scoping,
 * error parsing and testing stay in one layer.
 *
 * Config-only imports (e.g. `isSupabaseConfigured` in src/index.tsx) are
 * allowed: only the runtime client binding `supabase` is flagged.
 *
 * Usage: node scripts/check-layer-boundaries.mjs
 * Exit codes: 0 = clean, 1 = violations found.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
const violations = [];

/** Matches named imports from any module path ending in `supabaseClient`. */
const NAMED_IMPORT_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"][^'"]*supabaseClient['"]/g;
/** Matches default imports: `import supabase from '...supabaseClient'`. */
const DEFAULT_IMPORT_RE = /import\s+(\w+)\s+from\s*['"][^'"]*supabaseClient['"]/g;

/** A named binding is a violation when it exposes the runtime client itself. */
function clauseExposesClient(clause) {
  return clause
    .split(',')
    .map(part =>
      part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim()
    )
    .some(name => name === 'supabase');
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (full.endsWith('.tsx')) {
      yield full;
    }
  }
}

for (const file of walk(SRC_ROOT)) {
  const source = readFileSync(file, 'utf8');

  for (const match of source.matchAll(NAMED_IMPORT_RE)) {
    if (clauseExposesClient(match[1])) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(
        `${relative(process.cwd(), file).split(sep).join('/')}:${line} → ${match[0].trim()}`
      );
    }
  }

  for (const match of source.matchAll(DEFAULT_IMPORT_RE)) {
    if (match[1] === 'supabase') {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(
        `${relative(process.cwd(), file).split(sep).join('/')}:${line} → ${match[0].trim()}`
      );
    }
  }
}

if (violations.length > 0) {
  console.error(
    '❌ Layer-boundary violations — .tsx components must not import the Supabase runtime client:\n'
  );
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    '\nMove these calls into a feature service (Component → Hook → Service → API → Supabase).'
  );
  process.exit(1);
}

console.log('✅ Layer boundaries clean — no direct Supabase client imports in .tsx components.');
