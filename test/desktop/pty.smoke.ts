import { _electron as electron, expect, type ElectronApplication } from '@playwright/test'
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = mkdtempSync(join(tmpdir(), 'forja-desktop-pty-'))
const project = join(root, 'pty-project')
mkdirSync(project)
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
  await app.evaluate(({ BrowserWindow, dialog }, directory) => {
    BrowserWindow.getAllWindows()[0].setContentSize(1280, 1024)
    // Keep IPC, path validation and the PTY real; automate only the OS dialog result.
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] })
  }, project)
  await page.getByRole('button', { name: /Open project|Abrir projeto/ }).click()
  await expect(page.getByRole('complementary', { name: 'pty-project' })).toBeVisible()
  await page.getByRole('button', { name: /New conversation|Nova conversa/ }).click()
  await page.keyboard.type('Check the shell')
  await page.keyboard.press('Control+Enter')
  await page.getByRole('button', { name: /Toggle terminals|Alternar terminais/ }).click()
  await page.getByRole('button', { name: /New terminal|Novo terminal/ }).click()
  const screen = page.locator('.xterm-rows')
  await expect(screen).not.toBeEmpty({ timeout: 10_000 })
  await page.locator('.xterm-helper-textarea').focus()
  await page.keyboard.type('echo forja-pty-$((6*7)) && pwd\n')
  await expect(screen).toContainText('forja-pty-42', { timeout: 10_000 })
  await expect(screen).toContainText(realpathSync(project))
  const panel = page.getByRole('region', { name: /^(Terminals|Terminais)$/ })
  await page.getByRole('button', { name: /New terminal|Novo terminal/ }).click()
  await expect(panel.getByRole('tab')).toHaveCount(2)
  await panel.getByRole('tab').first().click()
  await expect(screen).toContainText('forja-pty-42')
  await page.waitForTimeout(500)
  await expect(screen).not.toContainText('1;2c')
  if (process.env.FORJA_PTY_SCREENSHOT)
    await page.screenshot({ path: process.env.FORJA_PTY_SCREENSHOT })
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.className ?? ''))
    .toContain('xterm-helper-textarea')
  await page.keyboard.press('Control+r')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /^(Close|Fechar) zsh$|^(Close|Fechar) [a-z]*sh$/ }).click()
  await expect(panel.getByRole('tab')).toHaveCount(1)
  await expect(panel.getByRole('tab')).toHaveText(/ 2/)
  console.log('PASS: Electron PTY shell starts in the project, runs input, keeps Ctrl+R and closes')
} finally {
  if (app) await app.close()
  rmSync(root, { recursive: true, force: true })
}
