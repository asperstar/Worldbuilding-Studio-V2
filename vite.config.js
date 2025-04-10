import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 55596,
    proxy: {
      '/api': {
        target: 'http://localhost:3002', // Backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});