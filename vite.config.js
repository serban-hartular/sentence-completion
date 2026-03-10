// vite.config.js
import { defineConfig } from 'vite'
import dns from 'dns'
import { resolve } from "path";

dns.setDefaultResultOrder('verbatim')

export default defineConfig({
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: '/var/www/language-game/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        root: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
})
