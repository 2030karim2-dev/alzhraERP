const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== Starting Weekly Application Maintenance ===");

// 1. Clean Build and Cache Directories
const dirsToRemove = [
    'node_modules/.cache',
    'node_modules/.vite',
    'dist'
];

dirsToRemove.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
        console.log(`🧹 Removing cache directory: ${dir}`);
        try {
            fs.rmSync(fullPath, { recursive: true, force: true });
        } catch (e) {
            console.error(`Failed to remove ${dir}: ${e.message}`);
        }
    }
});

// 2. Clean temporary and log files matching patterns
const rootPath = path.join(__dirname, '..');
const files = fs.readdirSync(rootPath);
files.forEach(file => {
    if (file.endsWith('.tmp') || file.endsWith('.bak') || file.includes('tsc_output')) {
        const filePath = path.join(rootPath, file);
        try {
            fs.unlinkSync(filePath);
            console.log(`🧹 Removed temporary file: ${file}`);
        } catch (e) {
            console.error(`Failed to remove ${file}: ${e.message}`);
        }
    }
});

console.log("=== Application Maintenance Complete ===");
console.log("💡 Tip: Consider implementing periodic Supabase backups via the dashboard.");
