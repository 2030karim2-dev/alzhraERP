/**
 * validate-barrels.ts
 * يتحقق من أن جميع ملفات index.ts (barrel files) تُعيد تصدير محتويات الملفات المجاورة
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';

interface BarrelCheck {
  barrelPath: string;
  missingExports: string[];
}

function findExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex = /export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

function findReExports(content: string): Set<string> {
  const reExports = new Set<string>();
  const reExportRegex = /export\s*\{[^}]+\}\s*from\s*['"]\.\/(\w+)['"]/g;
  let match;
  while ((match = reExportRegex.exec(content)) !== null) {
    reExports.add(match[1]);
  }

  // Also check direct re-exports: export { x } from '../file'
  const directRegex = /export\s+\{\s*(\w+)\s*\}\s*from\s*['"]\.\.\/(\w+)['"]/g;
  while ((match = directRegex.exec(content)) !== null) {
    // Mark the parent file as re-exported
  }

  return reExports;
}

function checkBarrel(barrelPath: string): BarrelCheck | null {
  const barrelContent = readFileSync(barrelPath, 'utf-8');
  const dir = dirname(barrelPath);
  const parentDir = resolve(dir, '..');
  const barrelName = basename(dir);

  // Check if there's a sibling .ts file with the same name
  const parentFile = resolve(parentDir, `${barrelName}.ts`);
  if (!existsSync(parentFile)) return null;

  const parentContent = readFileSync(parentFile, 'utf-8');
  const parentExports = findExports(parentContent);
  const reExportedFromParent = new Set<string>();

  // Find re-exports from '../filename'
  const fromParentRegex = new RegExp(
    `export\\s+(?:type\\s+)?\\{[^}]+\\}\\s*from\\s*['"]\\.\\.\\/${barrelName}['"]`,
    'g'
  );
  let match;
  while ((match = fromParentRegex.exec(barrelContent)) !== null) {
    const names =
      match[0]
        .match(/\{([^}]+)\}/)?.[1]
        ?.split(',')
        .map(s => s.replace(/^type\s+/, '').trim()) || [];
    names.forEach(n => reExportedFromParent.add(n));
  }

  const missing = parentExports.filter(e => !reExportedFromParent.has(e));

  if (missing.length > 0) {
    return { barrelPath, missingExports: missing };
  }

  return null;
}

function scanDirectory(dir: string): BarrelCheck[] {
  const issues: BarrelCheck[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = resolve(dir, entry);
      try {
        if (
          statSync(fullPath).isDirectory() &&
          !entry.startsWith('.') &&
          entry !== 'node_modules'
        ) {
          const indexPath = resolve(fullPath, 'index.ts');
          if (existsSync(indexPath)) {
            const issue = checkBarrel(indexPath);
            if (issue) issues.push(issue);
          }
          issues.push(...scanDirectory(fullPath));
        }
      } catch (e) {
        /* skip inaccessible dirs */
      }
    }
  } catch (e) {
    /* skip */
  }

  return issues;
}

// Main
const srcDir = resolve(process.cwd(), 'src');
console.log('🔍 فحص barrel exports...\n');

const issues = scanDirectory(srcDir);

if (issues.length === 0) {
  console.log('✅ جميع barrel files سليمة');
  process.exit(0);
} else {
  console.log('❌ Barrel files ناقصة:\n');
  for (const issue of issues) {
    console.log(`  ${issue.barrelPath}:`);
    console.log(`    missing: ${issue.missingExports.join(', ')}`);
  }
  process.exit(0); // Warning only, don't block
}
