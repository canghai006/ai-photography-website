import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Exclude large directories that can cause EBUSY on Windows
      ignored: [
        '**/tmp_effect_frames/**',
        '**/tmp_cinematic_profile*/**',
        '**/.vs/**',
        '**/storage/uploads/**',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        // Allow large file uploads (50MB + overhead)
        proxyTimeout: 120000,
        timeout: 120000,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
