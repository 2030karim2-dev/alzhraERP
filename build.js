import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting nested build for Vercel...');

try {
    const innerDir = path.join(__dirname, 'alzhraERP');
    
    // 1. Install dependencies in the inner directory
    console.log('📦 Installing inner dependencies...');
    execSync('npm install', { cwd: innerDir, stdio: 'inherit' });

    // 2. Build the inner Vite project
    console.log('🔨 Building inner project...');
    execSync('npm run build', { cwd: innerDir, stdio: 'inherit' });

    // 3. Move the dist folder to the root so Vercel can find it
    console.log('📂 Moving dist folder to root...');
    const innerDist = path.join(innerDir, 'dist');
    const outerDist = path.join(__dirname, 'dist');

    if (fs.existsSync(outerDist)) {
        fs.rmSync(outerDist, { recursive: true, force: true });
    }
    
    fs.renameSync(innerDist, outerDist);
    
    console.log('✅ Build completed successfully!');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
