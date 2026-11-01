# Plan: Conversation Agent Identity

> **Spec:** docs/specs/conversation-agent-identity/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Show each agent's AI tool in the feature cycle and tab, give agent replies a pixel-art mascot with a tool badge, and put replies on a gray surface.
**Architecture:** Frontend-only mock slice. The store keeps the role-to-tool mapping from the agent profiles; the `FeatureContext` and `Messages` widgets take display props; mascots are code-defined SVG sprites in `src/shared/ui`.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui, Zustand, Vitest + RTL, Playwright.
**Order:** 01h of the mock screens, after project-sidebar-navigator (01g).
**Total Tasks:** 5
**Estimated Complexity:** medium

## Dependencies

- [settings-screen](2026-10-31-settings-screen.md): agent profiles with a tool per role.
- [conversation-screen](2026-10-31-conversation-screen.md): `Messages`, `History` and the feature context.

## Execution Contract

- Commit each task through `git-commit` after its gates pass; never push.
- Task 3 ends with a user checkpoint: show the five mascots from the styleguide and wait for approval or adjustments before Task 4 uses them, even under `--agentic`.
- Colors come from Terminal Noir tokens; no hex values outside the sprite palette map.

## Acceptance

- The cycle shows the tool icon before every stage, with a "<role> · <tool>" tooltip, and the tab icon follows the current stage's tool.
- Every agent reply shows its mascot with the tool badge and reads "<role> (<tool>)" to assistive technology.
- Agent replies sit on a gray surface without a border; inner code, command and log blocks stay darker.

## Tasks

### Task 1: Keep the agent tool mapping in the store

**Requirement:** REQ-088
**Depends on:** none within this plan
**Files:**
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Modify: `src/renderer/src/shared/api/workbench-source.ts`
- Modify: `src/renderer/src/pages/settings/settings-page.tsx`
- Create: `test/renderer/agent-tools.test.ts`
- Test: `test/renderer/agent-tools.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'

it('loads each agent tool with the project and refreshes it after settings are saved', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  const settings = await source.loadSettings()
  expect(store.getState().agentTools).toEqual(
    Object.fromEntries(settings.agents.map((agent) => [agent.id, agent.tool])),
  )
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) =>
      agent.id === 'tester' ? { ...agent, tool: 'grok' } : agent,
    ),
  })
  await store.getState().refreshAgentTools()
  expect(store.getState().agentTools.tester).toBe('grok')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/agent-tools.test.ts`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

Store: `agentTools: Partial<Record<RoleId, ToolId>>` filled by `openProject` (after the snapshot loads, `source.loadSettings()`; a failure keeps the previous mapping) and `refreshAgentTools()`. The settings page calls `refreshAgentTools()` after a successful save. `ChatMessage` gains `tool?: ToolId`; `sendMessage` stamps the answering tool on the new agent message (`agentTools[role] ?? feature.tool`).

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/agent-tools.test.ts`. Expected: PASS. Also check: a streamed reply keeps its stamped tool after the mapping changes.

**Step 5: Commit**

Run: `/git commit`

### Task 2: Show tool icons in the feature cycle and on the feature tab

**Requirement:** REQ-088
**Depends on:** Task 1
**Files:**
- Modify: `src/widgets/workbench/ui/app-chrome.tsx`
- Modify: `src/renderer/src/pages/conversation/conversation-page.tsx`
- Modify: `site/src/pages/styleguide.tsx`
- Create: `test/renderer/cycle-tools.test.tsx`
- Test: `test/renderer/cycle-tools.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('shows each agent tool in the cycle and the current stage tool on the tab', async () => {
  const source = createMockSource({ locale: 'en' })
  const settings = await source.loadSettings()
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) =>
      agent.id === 'research' ? { ...agent, tool: 'codex' } : agent,
    ),
  })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const cycle = await screen.findByRole('list', { name: 'Cycle' })
  const research = within(cycle).getByText('Research').closest('li')!
  expect(within(research).getByRole('img', { name: 'Codex' })).toBeInTheDocument()
  fireEvent.focus(within(research).getByRole('img', { name: 'Codex' }))
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Research · Codex')
  const tab = screen.getByRole('tab', { name: /Login with OAuth/ })
  expect(within(tab).getByRole('img', { name: 'Codex' })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/cycle-tools.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`FeatureCycleStage` gains `tool?: ToolId` and `toolLabel?: string`; `FeatureContext` renders `ToolIcon` before the stage label, focusable (`tabIndex={0}`) inside a dark tooltip with "<label> · <tool>". The conversation page passes `agentTools[role]` per stage and maps the feature tab `tool` to `agentTools[feature.stage] ?? feature.tool`. Update the styleguide FeatureContext sample with tools.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/cycle-tools.test.tsx`. Expected: PASS. Also check: the current stage keeps its accent and `aria-current="step"`; gallery tests stay green.

**Step 5: Commit**

Run: `/git commit`

### Task 3: Draw the five agent mascots and review them in the styleguide

**Requirement:** REQ-089
**Depends on:** none within this plan
**Files:**
- Create: `src/shared/ui/agent-mascot.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `site/src/pages/styleguide.tsx`
- Create: `test/web/agent-mascot.test.tsx`
- Test: `test/web/agent-mascot.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, accessibility-guardrails, test-driven-development)
- Reviewers: test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AgentMascot, agentSprites } from '../../src/shared/ui'

it('draws five distinct 12x12 decorative sprites with a tool badge', () => {
  const roles = ['research', 'planner', 'implementer', 'tester', 'reviewer'] as const
  const grids = roles.map((role) => agentSprites[role].rows.join('\n'))
  expect(new Set(grids).size).toBe(5)
  for (const role of roles) {
    expect(agentSprites[role].rows).toHaveLength(12)
    expect(agentSprites[role].rows.every((row) => row.length === 12)).toBe(true)
  }
  const { container } = render(<AgentMascot role="tester" tool="claude" />)
  const svg = container.querySelector('svg[data-slot="agent-mascot"]')!
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('shape-rendering', 'crispEdges')
  expect(container.querySelector('[data-slot="tool-icon"]')).not.toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/web/agent-mascot.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`agentSprites` maps each role to `{ rows: string[12], palette: Record<char, token> }` where `.` is transparent and other characters map to Terminal Noir tokens (primary amber, foreground, muted, success, destructive). One silhouette family (same head and body) with a role accessory and accent: Research with a magnifying glass, Planner with a clipboard, Implementer with a wrench, Tester with a flask, Reviewer with glasses and a check. `AgentMascot({ role, tool, size = 28 })` renders the SVG (`viewBox="0 0 12 12"`, one `rect` per pixel, `aria-hidden`) in a rounded square and the `ToolIcon` badge at the bottom right. Add a styleguide card "Agent mascots" with all five at 28 px and 56 px, each with its tool badge.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/web/agent-mascot.test.tsx`. Expected: PASS. Then capture the styleguide card (Playwright screenshot) and **stop for the user's review of the five sprites**; apply requested changes to the row strings before Task 4.

**Step 5: Commit**

Run: `/git commit` (after the user approves the sprites).

### Task 4: Put mascots and the gray surface on agent replies

**Requirement:** REQ-089, REQ-090
**Depends on:** Task 1, Task 3
**Files:**
- Modify: `src/widgets/conversation/ui/messages.tsx`
- Modify: `src/renderer/src/features/conversation/history.tsx`
- Modify: `src/widgets/conversation/ui/message-parts.tsx`
- Modify: `docs/design/forja-2.0/component-fidelity.md`
- Create: `test/web/agent-replies.test.tsx`
- Test: `test/web/agent-replies.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Messages } from '../../src/widgets/conversation'

it('gives agent replies a mascot, a tool-aware author and a gray surface, and users none', () => {
  render(
    <Messages
      items={[
        { id: 'u', author: 'You', role: 'user', text: 'Fix it' },
        { id: 'a', author: 'Research', role: 'agent', text: 'On it', agent: 'research', tool: 'claude', toolLabel: 'Claude' },
        { id: 'e', author: 'Tester', role: 'event', text: 'Tester requested a fix' },
      ]}
    />,
  )
  const [user, agent, event] = screen.getAllByRole('listitem')
  expect(agent.querySelector('[data-slot="agent-mascot"]')).not.toBeNull()
  expect(agent).toHaveAttribute('data-surface', 'reply')
  expect(agent).toHaveTextContent('Research')
  expect(agent.querySelector('.sr-only')).toHaveTextContent('(Claude)')
  expect(user.querySelector('[data-slot="agent-mascot"]')).toBeNull()
  expect(event.querySelector('[data-slot="agent-mascot"]')).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/web/agent-replies.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`ConversationMessage` gains `agent?: RoleId`, `tool?: ToolId` and `toolLabel?: string`. Agent items render as a two-column row: the `AgentMascot` (28 px) on the left and the content on the right, on a gray surface (`bg-secondary`, no border, `rounded-md`, `data-surface="reply"`), with the author line "<role>" plus an `sr-only` " (<tool>)". User messages keep their current style without avatar; events stay as notices. In `message-parts.tsx`, code, command and log blocks use `bg-background` so they stay darker than the reply surface. `History` passes `agent`, `tool` (the stamped message tool) and `toolLabel`. Record in `component-fidelity.md` that agent replies now carry a mascot by user decision on 2026-10-31 (user messages and timestamps unchanged).

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/web/agent-replies.test.tsx`. Expected: PASS. Also check: highlight ring (View request) still shows on agent replies; existing message tests stay green.

**Step 5: Commit**

Run: `/git commit`

### Task 5: Verify the identity in the browser

**Requirement:** REQ-088, REQ-089, REQ-090
**Depends on:** Task 4
**Files:**
- Create: `test/app-e2e/agent-identity.spec.ts`
- Test: `test/app-e2e/agent-identity.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: consequences-reviewer

**Step 1: Write the failing test**

```typescript
import { expect, test } from '@playwright/test'
test('agent replies show mascots on a gray surface and the cycle shows tools', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  const cycle = page.getByRole('list', { name: 'Cycle' })
  await expect(cycle.locator('[data-slot="tool-icon"]')).toHaveCount(5)
  const reply = page.locator('[data-surface="reply"]').first()
  await expect(reply.locator('[data-slot="agent-mascot"]')).toBeVisible()
  const bg = await reply.evaluate((el) => getComputedStyle(el).backgroundColor)
  const page_bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).not.toBe(page_bg)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm run test:e2e:app -- agent-identity.spec.ts`
Expected: FAIL before Tasks 2 to 4 land; PASS after.

**Step 3: Write minimal implementation**

Add the spec; fix selector drift in the implementation, not in the intent.

**Step 4: Run test to verify it passes**

Run: `rtk npm run test:e2e:app`. Expected: all specs PASS.

**Step 5: Commit**

Run: `/git commit`

## Final Validation and Handoff

Run typecheck, lint, format check, the full Vitest suite with coverage, `npm run build` and `npm run test:e2e:app`. Capture a conversation screenshot with the mascots and the gray surface for the user. Update this slice's STATE.md, the queue in `docs/plans/README.md` and the requirement map.
