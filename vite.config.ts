import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [ react() ],
  server: {
    host: true
  },
  preview: {
    host: true
  },
  build: {
    outDir: 'app-dist',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about.html'
      }
    }
  }
});
