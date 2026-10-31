import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIREBASE_PROJECT = 'ascode-e08f8'
const HOSTING_SITE = 'forjav2'

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(siteRoot, 'dist')
const stage = join(siteRoot, '.deploy')

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('site/dist is missing: run npm run build:site first')
}

rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
for (const entry of ['assets', 'stitch', 'index.html', 'favicon.svg', 'pt-br', 'styleguide']) {
  const source = join(dist, entry)
  if (existsSync(source)) cpSync(source, join(stage, entry), { recursive: true })
}
writeFileSync(
  join(stage, 'firebase.json'),
  JSON.stringify(
    { hosting: { site: HOSTING_SITE, public: '.', ignore: ['firebase.json', '**/.*'] } },
    null,
    2,
  ) + '\n',
)

execFileSync(
  'firebase',
  ['deploy', '--only', 'hosting', '--project', FIREBASE_PROJECT, '--non-interactive'],
  {
    cwd: stage,
    stdio: 'inherit',
  },
)
console.log(`deployed to https://${HOSTING_SITE}.web.app`)
