import { defineConfig } from 'vite'

export default defineConfig({
  base: '/day30-talk-to-marvin/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
