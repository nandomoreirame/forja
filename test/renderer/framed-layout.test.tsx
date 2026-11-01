import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

const backgrounds = /\bbg-(sidebar|secondary|card)\b/

it('frames each workbench part with its own rounded border on the app background', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('button', { name: 'Toggle terminals' }))
  const parts = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="workbench-part"]'))
  expect(parts.map((part) => part.dataset.part)).toEqual(['sidebar', 'editor', 'panel', 'context'])
  for (const part of parts) {
    expect(part.className).toMatch(/\brounded-part\b/)
    expect(part.className).toMatch(/\bborder\b/)
    expect(part.className).not.toMatch(backgrounds)
    // Breathing room around every frame, like VS Code's part gaps.
    expect(part.parentElement!.className).toMatch(/\bp-1\b/)
  }
  for (const bar of [document.querySelector('header')!, document.querySelector('footer')!]) {
    expect(bar.className).not.toMatch(/\bborder-[tb]\b/)
    expect(bar.className).not.toMatch(backgrounds)
  }
})

it('rounds the prompt composer like the workbench frames', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const composer = screen.getByRole('textbox', { name: /prompt/i }).closest('.border')!
  expect(composer.className).toMatch(/\brounded-part\b/)
  expect(composer.className).not.toMatch(/\brounded-xl\b/)
})
