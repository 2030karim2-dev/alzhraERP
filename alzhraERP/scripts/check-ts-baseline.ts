/**
 * check-ts-baseline.ts
 * ---------------------------------------------------------------
 * "No new TypeScript errors" ratchet.
 *
 * The codebase currently carries inherited type errors (the count
 * lives in scripts/ts-error-baseline.txt). Until that debt is paid
 * down, hard-failing on `tsc --noEmit` would block every push.
 * Instead this gate fails ONLY when the error count INCREASES.
 *
 * When you fix errors, lower the number in
 * scripts/ts-error-baseline.txt in the same commit to lock it in.
 *
 * Run:  npx tsx scripts/check-ts-baseline.ts
 * Exit: 1 if the error count exceeds the baseline, 0 otherwise.
 *
 * NOTE: kept pure ASCII so the encoding guard never flags it.
 * ---------------------------------------------------------------
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'ts-error-baseline.txt');

const baseline = Number.parseInt(fs.readFileSync(BASELINE_FILE, 'utf8').trim(), 10);
if (Number.isNaN(baseline)) {
    console.error('[ts-baseline] FAILED: ts-error-baseline.txt does not contain a number.');
    process.exit(1);
}

console.log('[ts-baseline] Running tsc --noEmit (can take a minute)...');

let output = '';
try {
    execSync('npx tsc --noEmit --pretty false', {
        cwd: ROOT,
        stdio: 'pipe',
        maxBuffer: 32 * 1024 * 1024,
    });
} catch (error: any) {
    // tsc exits non-zero when errors exist; capture its report.
    output = `${error?.stdout?.toString() ?? ''}\n${error?.stderr?.toString() ?? ''}`;
}

const current = (output.match(/error TS\d+/g) || []).length;

if (current > baseline) {
    console.error(`\n[ts-baseline] FAILED: ${current} type errors (baseline: ${baseline}, +${current - baseline} NEW).`);
    console.error('Fix the new errors before pushing. Inspect with: npx tsc --noEmit --pretty false\n');
    process.exit(1);
}

if (current < baseline) {
    console.log(`[ts-baseline] Progress: errors dropped ${baseline} -> ${current} (-${baseline - current}).`);
    console.log('[ts-baseline] Lower scripts/ts-error-baseline.txt in the same commit to lock it in.');
}

console.log(`[ts-baseline] OK: ${current} type errors (baseline: ${baseline}). No new errors introduced.`);
