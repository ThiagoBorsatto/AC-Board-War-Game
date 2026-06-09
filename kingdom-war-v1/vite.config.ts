import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // svgData.ts tem ~8.8MB de base64 — aumenta o limite para não travar o build
    chunkSizeWarningLimit: 12000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa as imagens SVG num chunk próprio para não bloquear o bundle principal
          'svg-data': ['./src/data/svgData'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
