import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'frontend',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EduSync — Learn with intention',
        short_name: 'EduSync',
        description: 'A focused learning workspace for students.',
        theme_color: '#28213f',
        background_color: '#f7f6fa',
        display: 'standalone',
      },
    }),
  ],
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
  },
});
