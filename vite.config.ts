import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('componentVariantEngine')) {
            return 'variant-matrix-engine';
          }
          if (id.includes('/src/engines/') || id.includes('\\src\\engines\\')) {
            return 'engines';
          }
          if (
            id.includes('/src/components/InspectorPanel') ||
            id.includes('\\src\\components\\InspectorPanel') ||
            id.includes('/src/components/LayersPanel') ||
            id.includes('\\src\\components\\LayersPanel')
          ) {
            return 'studio-panels';
          }
          return undefined;
        },
      },
    },
  },
});
