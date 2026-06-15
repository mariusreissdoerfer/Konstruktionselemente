/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relativer Basis-Pfad für den Build ("./"), damit die App unter jedem
// Unterpfad und unabhängig von Groß-/Kleinschreibung des Repo-Namens läuft
// (GitHub Pages serviert z. B. unter ".../konstruktionselemente/").
// Im Dev-Server bleibt der Pfad absolut ("/").
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
