import { isAbsolute, join } from 'node:path'
import { type Plugin } from 'vite'
import { collectMockLibrary, readSkills } from './collect'

const virtualId = 'virtual:forja-mock-library'
const resolvedId = `\0${virtualId}`

export function mockLibrary(): Plugin {
  const repoRoot = process.cwd()
  let enabled = false
  return {
    name: 'forja-mock-library',
    configResolved(config) {
      enabled = config.command === 'serve'
    },
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id !== resolvedId) return
      if (!enabled) return 'export default { documents: [] }'
      const library = collectMockLibrary({ repoRoot })
      return `export default ${JSON.stringify(library)}`
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/__forja/skills')) return next()
        let url: URL
        try {
          url = new URL(req.url, 'http://localhost')
        } catch {
          return next()
        }
        if (url.pathname !== '/__forja/skills' || req.method !== 'GET') return next()
        const address = req.socket.remoteAddress ?? ''
        const fetchSite = req.headers['sec-fetch-site']
        const origin = req.headers.origin
        const sameOrigin =
          fetchSite === 'same-origin' ||
          fetchSite === 'none' ||
          (fetchSite === undefined &&
            (origin === undefined || origin === `http://${req.headers.host}`))
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) || !sameOrigin) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        const root = url.searchParams.get('root')
        if (root !== null && !isAbsolute(root) && root !== '~' && !root.startsWith('~/')) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Invalid skills root' }))
          return
        }
        res.end(JSON.stringify(root ? readSkills(root) : []))
      })
      // docs/ sits outside the Vite root, so watch it explicitly and reload the library on change.
      server.watcher.add([join(repoRoot, 'docs/specs'), join(repoRoot, 'docs/plans')])
      server.watcher.on('all', (_event, file) => {
        if (
          file.startsWith(join(repoRoot, 'docs/specs')) ||
          file.startsWith(join(repoRoot, 'docs/plans'))
        ) {
          const module = server.moduleGraph.getModuleById(resolvedId)
          if (module) server.moduleGraph.invalidateModule(module)
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}
