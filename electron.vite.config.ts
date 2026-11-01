import { mockLibrary } from './scripts/mock-library/vite-plugin'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    build: { rollupOptions: { input: { index: 'src/main/index.ts', core: 'src/core/index.ts' } } },
  },
  preload: {
    build: {
      rollupOptions: {
        input: 'src/preload/index.ts',
        output: { format: 'cjs', entryFileNames: 'index.cjs' },
      },
    },
  },
  renderer: {
    plugins: [mockLibrary(), react(), tailwindcss()],
    resolve: { alias: { '@': resolve('src') } },
  },
})
