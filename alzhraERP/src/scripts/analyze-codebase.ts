// src/scripts/analyze-codebase.ts
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../');

function scanDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath, fileList);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const allFiles = scanDir(SRC_DIR);
console.log(`Scanning ${allFiles.length} TypeScript files...`);

const issues = {
    missingDepsInEffect: [] as string[],
    directDOMManipulation: [] as string[],
    nakedApiCalls: [] as string[],
    consoleLogs: [] as string[],
    anyTypes: [] as string[],
};

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(SRC_DIR, file);

    // Skip this script itself
    if (relativePath.includes('analyze-codebase')) return;

    if (content.match(/useEffect\s*\([^,]+,\s*\[\]\)/) && content.includes('fetch')) {
        // A bit naive, but checks for empty dependency arrays that might need variables
        // issues.missingDepsInEffect.push(relativePath);
    }

    if (content.includes('document.getElementById') || content.includes('document.querySelector')) {
        issues.directDOMManipulation.push(relativePath);
    }

    // Searching for api calls not wrapped in react-query
    if (relativePath.includes('components') && content.match(/await\s+supabase/)) {
        issues.nakedApiCalls.push(relativePath);
    }

    if (content.includes('console.log')) {
        issues.consoleLogs.push(relativePath);
    }

    if (content.match(/:\s*any[\s>,=]/) || content.match(/as\s+any/)) {
        issues.anyTypes.push(relativePath);
    }
});

console.log("\n=== CODEBASE ANALYSIS REPORT ===");

console.log(`\n❌ Direct DOM Manipulation (React Anti-Pattern): ${issues.directDOMManipulation.length} files`);
issues.directDOMManipulation.slice(0, 5).forEach(f => console.log(`  - ${f}`));

console.log(`\n❌ Naked Supabase API Calls in Components (Should use React Query / Service layer): ${issues.nakedApiCalls.length} files`);
issues.nakedApiCalls.slice(0, 10).forEach(f => console.log(`  - ${f}`));

console.log(`\n⚠️ Files containing 'any' types (Type Safety Risk): ${issues.anyTypes.length} files`);
console.log(`  (Top 10 list omitted for brevity, but ${issues.anyTypes.length} is a metric to track)`);

console.log(`\n⚠️ Files with console.log (Cleanup needed): ${issues.consoleLogs.length} files`);
