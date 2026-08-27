import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/tokenportal-api': {
        target: 'https://api.taotoken.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/tokenportal-api/, ''),
      },
    },
    allowedHosts: ['lucky123.cc.cd']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
