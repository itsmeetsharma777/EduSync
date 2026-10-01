import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  plugins: [],
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
  },
});
