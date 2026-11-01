import { mockLibrary } from './scripts/mock-library/vite-plugin'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'src/renderer',
  plugins: [mockLibrary(), react(), tailwindcss()],
  resolve: { alias: { '@': resolve('src') } },
})
