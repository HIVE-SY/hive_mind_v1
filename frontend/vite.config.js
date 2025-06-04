import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'react',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../static/js',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        login: path.resolve(__dirname, 'react/index.html'),
      },
      output: {
        entryFileNames: 'bundle.js',
      },
    },
  },
});
