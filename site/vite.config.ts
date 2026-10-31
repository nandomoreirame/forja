import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const siteRoot = fileURLToPath(new URL('.', import.meta.url))

function directoryIndex(): Plugin {
  return {
    name: 'forja-directory-index',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url ?? '/').split('?')
        if (path === '/' || path.endsWith('/') || path.includes('.')) return next()
        const candidate = join(siteRoot, 'dist', path, 'index.html')
        if (existsSync(candidate) && statSync(candidate).isFile())
          req.url = `${path}/${query ? `?${query}` : ''}`
        next()
      })
    },
  }
}

export default defineConfig({
  root: siteRoot,
  plugins: [react(), tailwindcss(), directoryIndex()],
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: { outDir: 'dist', emptyOutDir: true },
})
