import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const localNm = resolve(root, 'node_modules');
const fallbackNm = process.env.SUBOFICIALES_NM_ROOT || join(homedir(), '.local-nm', 'suboficiales-2026', 'node_modules');
const hasLocalNm = existsSync(join(localNm, 'vite'));
const nmRoot = hasLocalNm ? localNm : fallbackNm;

const req = createRequire(join(nmRoot, 'package.json'));
const { defineConfig } = req('vite');
const react = req('@vitejs/plugin-react').default ?? req('@vitejs/plugin-react');
const tailwindcss = req('@tailwindcss/vite').default ?? req('@tailwindcss/vite');
const { VitePWA } = req('vite-plugin-pwa');

/** Resuelve dependencias desde el caché NTFS local cuando ./node_modules no está dentro de Google Drive */
function externalNodeModulesPlugin() {
  if (hasLocalNm) return null;
  const pkgs = ['react', 'react-dom', 'lucide-react', 'workbox-window', 'workbox-core', '@testing-library/react', 'vitest', 'jsdom'];
  return {
    name: 'external-node-modules-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'tailwindcss') {
        return join(nmRoot, 'tailwindcss', 'index.css');
      }
      if (source === 'lucide-react') {
        return join(nmRoot, 'lucide-react', 'dist', 'esm', 'lucide-react.mjs');
      }
      if (source === 'workbox-window') {
        return join(nmRoot, 'workbox-window', 'build', 'workbox-window.prod.es5.mjs');
      }
      if (source === 'vitest') {
        return join(nmRoot, 'vitest', 'dist', 'index.js');
      }
      if (pkgs.some((p) => source === p || source.startsWith(p + '/'))) {
        try {
          return req.resolve(source);
        } catch {
          return null;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    externalNodeModulesPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'PATRONATO 2026 - Tests de Inglés Suboficiales',
        short_name: 'Suboficiales',
        description: 'Plataforma de preparación y tests de inglés para la oposición a la Escala de Suboficiales 2026.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b0f19',
        theme_color: '#1e3a8a',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
