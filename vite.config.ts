
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react({
      // Babel transform for faster JSX in dev
      babel: {
        plugins: [],
      },
    }),
    nodePolyfills({
      include: ['stream', 'buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve((process as any).cwd(), './src'),
    },
  },
  define: {
    'process.env': {},
  },
  optimizeDeps: {
    // ⚡ Pre-bundle all frequently used packages at startup to avoid runtime bundling
    include: [
      'stream', 'buffer', 'process',
      'react', 'react-dom', 'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'lucide-react',
      'date-fns',
    ],
    // ⚡ Force exclude heavy rarely-used packages from pre-bundling
    exclude: ['jspdf', 'html2canvas', 'xlsx-js-style'],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    // ⚡ No source maps in production = faster build + smaller output
    sourcemap: false,
    rollupOptions: {
      output: {
        // ⚡ Improved manual chunking strategy
        manualChunks(id) {
          // Core React runtime
          if (id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }
          // Data management
          if (id.includes('node_modules/@supabase') ||
            id.includes('node_modules/@tanstack') ||
            id.includes('node_modules/zustand')) {
            return 'vendor-data';
          }
          // Charts — heavy, load only on chart pages
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          // Icons — tree-shaken but still large
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Heavy export libs — only needed when user exports
          if (id.includes('node_modules/xlsx-js-style')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/jspdf') ||
            id.includes('node_modules/html2canvas')) {
            return 'vendor-export';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
        },
      },
    },
  },
  server: {
    port: 8081,
    // ⚡ Use HTTP/1.1 for dev (faster HMR in some setups)
    hmr: true,
  },
});
