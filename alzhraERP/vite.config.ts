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
      'stream',
      'buffer',
      'process',
      'react',
      'react-dom',
      'react-router-dom',
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
    // ⚡ Do NOT warm the heavy, rarely-used vendors on first paint. Vite injects
    // modulepreload links for the deps of the entry's dynamic imports, which put
    // jsPDF + html2canvas (vendor-export, 580KB) and xlsx-js-style
    // (vendor-xlsx, 849KB) into the initial download even though they are only
    // needed when the user actually clicks «تصدير PDF/Excel». They still load on
    // demand — only the startup preload is skipped.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) =>
        deps.filter(dep => !/vendor-(export|xlsx|charts|qr)-/.test(dep)),
    },
    // ⚡ No source maps in production = faster build + smaller output
    sourcemap: false,
    rollupOptions: {
      output: {
        // ⚡ Improved and memory-efficient manual chunking strategy
        manualChunks(id) {
          /**
           * ⚡ Vite's virtual preload helper MUST live in a chunk the entry
           * always loads. Left to Rollup heuristics it landed inside
           * `vendor-export` (the jsPDF/html2canvas chunk) — and because EVERY
           * chunk containing a dynamic import statically imports that helper,
           * the app entry was forced to download the whole 593KB vendor at
           * boot (verified in dist: `from"./vendor-export-*.js"`), defeating
           * the modulePreload filter below. Pinning it to `vendor-react`
           * (always part of the initial graph) makes vendor-export truly
           * on-demand again.
           */
          if (id.includes('preload-helper')) {
            return 'vendor-react';
          }
          /**
           * React + the injected Node polyfills share ONE chunk on purpose:
           * `react-dom` needs the polyfilled globals and the polyfills' shim
           * modules are pulled back by React, so splitting them produced a
           * circular chunk (vendor-polyfills -> vendor-react -> vendor-polyfills).
           * Keeping them together also stops Rollup from merging them into the
           * heavy `vendor-export` chunk (jsPDF/html2canvas), which previously made
           * the app ENTRY download that 580KB chunk on first paint.
           */
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('vite-plugin-node-polyfills') ||
            id.includes('node_modules/buffer/') ||
            id.includes('node_modules/process/') ||
            id.includes('node_modules/stream-browserify') ||
            id.includes('node_modules/readable-stream')
          ) {
            return 'vendor-react';
          }
          if (
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/@remix-run/')
          ) {
            return 'vendor-router';
          }
          if (
            id.includes('node_modules/@supabase') ||
            id.includes('node_modules/@tanstack') ||
            id.includes('node_modules/zustand')
          ) {
            return 'vendor-data';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // ⚡ Small shared helpers MUST own their chunk. If Rollup is left free to
          // place them, it merges them into whichever shared chunk exists — e.g.
          // `clsx`/`tailwind-merge` (the `cn()` helper used everywhere, including the
          // entry) ended up inside `vendor-charts`, so the ENTRY statically imported
          // the whole 448KB recharts+d3 chunk just to call `cn()`.
          if (id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/react-is') || id.includes('node_modules/framer-motion')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qr';
          }
          // NOTE: the injected Node polyfills (buffer/process/stream) are grouped
          // with react above on purpose — see the comment there.
          if (id.includes('node_modules/xlsx-js-style') || id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-export';
          }
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
