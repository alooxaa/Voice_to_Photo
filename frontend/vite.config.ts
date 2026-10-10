import react from '@vitejs/plugin-react';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

const backend = 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // shared/commands.json lives next to the frontend folder; the dev server may read it.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../shared'] },
    // The backend serves the API and uploaded photos; the proxy keeps them
    // on the same origin as the app, so canvas pixels can be read and saved.
    proxy: {
      '/api': backend,
      '/media': backend,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
