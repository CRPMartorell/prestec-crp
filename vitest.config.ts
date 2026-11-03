import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    css: false,
    // Els workers de tipus "forks" no funcionen en entorns confinats de Windows
    // i, a més, són més lents d'arrencar; amb "threads" n'hi ha prou.
    pool: 'threads',
  },
});
