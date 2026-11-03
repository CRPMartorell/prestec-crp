import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

type AppBuild = 'all' | 'public' | 'private';

export default defineConfig(({ mode }) => {
  const app: AppBuild = mode === 'public' || mode === 'private' ? mode : 'all';

  // Cada build inclou nomes les seves pagines: el bundle public no
  // referencia mai el panell intern ni el seu punt d'entrada.
  const input: Record<string, string> =
    app === 'public'
      ? { main: 'index.html' }
      : app === 'private'
        ? { admin: 'admin.html' }
        : { main: 'index.html', admin: 'admin.html' };

  return {
    // GitHub Pages serveix el projecte en una subcarpeta (/prestec-crp/).
    // En local i a Cloudflare no cal cap prefix.
    base: process.env.VITE_BASE || '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: app === 'all' ? 'dist' : `dist/${app}`,
      rollupOptions: { input },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
