
import fs from 'fs';
import path from 'path';

// Manual glob implementation to avoid external dependencies
function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      walk(file, results);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const srcDir = path.resolve('src');
const files = walk(srcDir);

let hasError = false;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(file);
      const fullPath = path.resolve(dir, importPath);
      
      let exists = false;
      let actualPath = '';
      let base = '';
      let parentDir = '';

      // Try different extensions
      const extensions = ['', '.ts', '.tsx', '.d.ts', '/index.ts', '/index.tsx'];
      for (const ext of extensions) {
        const p = fullPath + ext;
        if (fs.existsSync(p)) {
          exists = true;
          actualPath = p;
          base = path.basename(actualPath);
          parentDir = path.dirname(actualPath);
          break;
        }
      }

      if (exists) {
        // Now check case sensitivity explicitly on Windows by listing the directory
        const filesInDir = fs.readdirSync(parentDir);
        if (!filesInDir.includes(base)) {
          console.error(`Case mismatch in ${file}:`);
          console.error(`  Import: ${importPath}`);
          console.error(`  Base: ${base}`);
          console.error(`  Parent: ${parentDir}`);
          hasError = true;
        }
      }
    }
  }
});

if (!hasError) {
  console.log('No case-sensitivity issues found.');
}
