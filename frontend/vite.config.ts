/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4994',
      '/image': 'http://127.0.0.1:4994',
    }
  },
  test: {
    exclude: ['tests/**', 'node_modules/**'],
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts', // Verify if this exists, but mainly exclude is key
    // actually let's just use defaults + exclude
    globals: true, // if needed
  }
})
