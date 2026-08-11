import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Proxy cho SSO Identity Server (ABP OpenIddict) tại localhost:44391 để bypass CORS ở môi trường Dev
      '/identity-server': {
        target: 'http://localhost:44391',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/identity-server/, ''),
      },
      // Proxy cho API Gateway NestJS BFF tại localhost:3001
      '/api-gateway': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-gateway/, ''),
      },
    },
  },
});
