import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite-api-plugin'

export default defineConfig({
  plugins: [react(), apiPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
