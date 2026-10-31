import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'vite'

export const outputRoutes = [
  { pathname: '/', locale: 'en', lang: 'en', page: 'landing' },
  { pathname: '/pt-br', locale: 'pt-br', lang: 'pt-BR', page: 'landing' },
  { pathname: '/styleguide', locale: 'en', lang: 'en', page: 'styleguide' },
  { pathname: '/pt-br/styleguide', locale: 'pt-br', lang: 'pt-BR', page: 'styleguide' },
] as const

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(siteRoot, 'dist')

const descriptions = {
  en: 'An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.',
  'pt-br':
    'Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.',
} as const

function outputFile(pathname: string): string {
  return pathname === '/'
    ? join(distDir, 'index.html')
    : join(distDir, pathname.slice(1), 'index.html')
}

export function withPageMetadata(
  template: string,
  route: (typeof outputRoutes)[number],
  body: string,
): string {
  const noindex = route.page === 'styleguide' ? '<meta name="robots" content="noindex" />' : ''
  const description = descriptions[route.locale]
  return template
    .replace(/<html lang="[^"]*"/, `<html lang="${route.lang}"`)
    .replace(
      /<meta\s+name="description"[^>]*>/,
      `<meta name="description" content="${description}" />${noindex}`,
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

export async function prerender(): Promise<void> {
  const template = readFileSync(join(distDir, 'index.html'), 'utf8')
  const server = await createServer({
    configFile: join(siteRoot, 'vite.config.ts'),
    appType: 'custom',
    server: { middlewareMode: true, hmr: false },
    logLevel: 'error',
  })
  try {
    const entry = await server.ssrLoadModule('/src/entry-server.tsx')
    for (const route of outputRoutes) {
      const html = withPageMetadata(template, route, entry.renderRoute(route.pathname))
      const file = outputFile(route.pathname)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, html)
    }
  } finally {
    await server.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prerender()
  console.log(`prerendered ${outputRoutes.length} routes`)
}
