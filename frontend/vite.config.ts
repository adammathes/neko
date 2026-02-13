/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/v2/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4994',
      '/image': 'http://127.0.0.1:4994',
    }
  },
})
