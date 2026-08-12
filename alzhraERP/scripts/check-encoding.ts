/**
 * check-encoding.ts
 * ---------------------------------------------------------------
 * Guards against the "Arabic mojibake" incident class:
 * UTF-8 source files that were saved through a Windows-1256
 * (or Latin-1) codepage, corrupting every Arabic string.
 *
 * It scans all source files for *mojibake signatures* — character
 * pairs that are impossible in genuine Arabic text but typical
 * of a mis-decoded file.
 *
 * NOTE: All patterns are built from explicit \uXXXX code points so
 * this guard file itself stays pure ASCII and can never be the
 * victim of the very corruption it detects.
 *
 * Exit code 1 (CI failure) if any signature is found.
 * Run: npm run check:encoding
 * ---------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['src', 'supabase', 'scripts'];
const FILE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.sql', '.md']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'dist-electron', '.git', 'coverage', 'playwright-report']);

/**
 * Each entry: [pattern source, description].
 * All pairs below cannot occur in genuine Arabic prose.
 *
 *  1. cp1256-misread Arabic: lead byte U+0637 / U+0638 followed by a
 *     Latin-1 (U+0080-U+00BF) or punctuation (U+2010-U+205F, U+20AC-U+2122)
 *     second byte. Example: U+0637 + U+00A7 was originally the letter "ا".
 *  2. U+064B U+06BA: emoji lead bytes F0 9F misread via cp1256.
 *  3. U+00E2 + byte char: UTF-8 punctuation misread as Latin-1.
 *  4. U+00C3 + byte char: UTF-8 accented text misread as Latin-1.
 *  5. U+FFFD: a failed decode was committed to disk.
 */
const SIGNATURES: Array<[RegExp, string]> = [
    [
        new RegExp('[\\u0637\\u0638][\\u0080-\\u00BF\\u2010-\\u205F\\u20AC-\\u2122]'),
        'cp1256-misread Arabic (lead byte + Latin-1/punctuation second byte)',
    ],
    [
        new RegExp('\\u064B\\u06BA'),
        'cp1256-misread emoji (F0 9F lead bytes appear as U+064B U+06BA)',
    ],
    [
        new RegExp('\\u00E2[\\u0080-\\u00BF\\u2010-\\u2122]'),
        'Latin-1-misread UTF-8 punctuation (U+00E2 family)',
    ],
    [
        new RegExp('\\u00C3[\\u0080-\\u00BF]'),
        'Latin-1-misread UTF-8 accented text (U+00C3 family)',
    ],
    [
        new RegExp('\\uFFFD'),
        'U+FFFD replacement character (failed decode committed to disk)',
    ],
];

interface Finding {
    file: string;
    line: number;
    signature: string;
    excerpt: string;
}

function walk(dir: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (FILE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
    return out;
}

const findings: Finding[] = [];

for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
        // Never flag the guard itself (it documents the signatures)
        if (path.resolve(file) === path.resolve(__filename)) continue;
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split(/\r?\n/);
        lines.forEach((lineText, idx) => {
            for (const [regex, signature] of SIGNATURES) {
                regex.lastIndex = 0;
                if (regex.test(lineText)) {
                    findings.push({
                        file: path.relative(ROOT, file),
                        line: idx + 1,
                        signature,
                        excerpt: lineText.trim().slice(0, 100),
                    });
                }
            }
        });
    }
}

if (findings.length > 0) {
    console.error(`\n[encoding-guard] FAILED: ${findings.length} mojibake signature(s) found:\n`);
    for (const f of findings.slice(0, 30)) {
        console.error(`  ${f.file}:${f.line} - ${f.signature}`);
        console.error(`     | ${f.excerpt}`);
    }
    if (findings.length > 30) console.error(`  ... and ${findings.length - 30} more.`);
    console.error('\nFix: re-save the file as UTF-8, or restore the corrupted strings.\n');
    process.exit(1);
}

console.log('[encoding-guard] OK: no mojibake signatures found. All source is clean UTF-8.');
