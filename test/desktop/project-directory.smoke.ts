import { _electron as electron, expect, type ElectronApplication } from '@playwright/test'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = mkdtempSync(join(tmpdir(), 'forja-desktop-picker-'))
const selected = join(root, 'selected-project')
mkdirSync(selected)
const second = join(root, 'second-project')
mkdirSync(second)
const env: Record<string, string> = {}
for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value
env.XDG_CONFIG_HOME = join(root, 'config')
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_RENDERER_URL
let app: ElectronApplication | undefined
try {
  app = await electron.launch({
    args: [
      ...(process.platform === 'linux' ? ['--ozone-platform=headless', '--disable-gpu'] : []),
      'out/main/index.js',
    ],
    env,
  })
  const page = await app.firstWindow()
  await app.evaluate(
    ({ BrowserWindow, dialog }, directories) => {
      BrowserWindow.getAllWindows()[0].setContentSize(1280, 1024)
      // Keep the native IPC and path validation real; automate only the OS dialog result.
      let calls = 0
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [directories[Math.min(calls++, directories.length - 1)]],
      })
    },
    [selected, second],
  )
  await page.getByRole('button', { name: /Open project|Abrir projeto/ }).click()
  await expect(page.getByRole('complementary', { name: 'selected-project' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText(selected)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Control+o')
  await expect(page.getByRole('complementary', { name: 'second-project' })).toBeVisible()
  await page.keyboard.press('Control+r')
  await expect(page.getByRole('option', { name: /selected-project/ })).toHaveCount(1)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+Shift+p')
  await expect(page.getByRole('option', { name: /selected-project/ })).toHaveCount(0)
  await expect(page.getByRole('option', { name: /Recent projects|Projetos recentes/ })).toHaveCount(
    1,
  )
  await page.keyboard.press('Escape')
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
  })
  await page.keyboard.press('Control+o')
  await expect(page.getByRole('complementary', { name: 'second-project' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  console.log(
    'PASS: Electron directory picker IPC, selected path, cancellation and command/history separation',
  )
} finally {
  if (app) await app.close()
  rmSync(root, { recursive: true, force: true })
}
