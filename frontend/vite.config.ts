import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const backend = 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
