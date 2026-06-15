/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Basis-Pfad für GitHub Pages: https://<user>.github.io/konstruktionselemente/
// Lokal (dev) bleibt der Pfad "/".
const base = process.env.GITHUB_ACTIONS ? '/konstruktionselemente/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
