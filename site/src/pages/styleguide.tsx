import { ChevronUp, FolderGit2, Pencil, Settings, SquareTerminal, Terminal } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui'
import {
  AppStatusbar,
  AppTopbar,
  FeatureContext,
  FeatureTabs,
  SidebarRow,
} from '@/widgets/workbench'
import { Composer, Messages } from '@/widgets/conversation'
import { TerminalPreview } from '@/widgets/terminal'
import { DocumentPreview, MarkdownPreview, MermaidPreview } from '@/widgets/documents'
import { PrimitivesShowcase } from '../components/primitives-showcase'
import { galleryCopy } from '../mocks/gallery'
import { gallerySectionCopy } from '../mocks/gallery-sections'
import { productMock } from '../mocks/product'

const tokens = [
  ['canvas', '#0E0E0E'],
  ['chrome', '#1C1C1C'],
  ['surface', '#121214'],
  ['overlay', '#18181B'],
  ['border', '#2A2A2A'],
  ['foreground', '#E6E6E6'],
  ['muted', '#979797'],
  ['accent', '#F5A623'],
] as const

function Section({
  id,
  title,
  description,
  code,
  children,
}: {
  id: string
  title: string
  description?: string
  code?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 id={id} className="text-[14px] font-bold uppercase tracking-wider text-[#F5A623]">
            {title}
          </h2>
          {description ? (
            <span className="font-mono text-[11px] text-[#979797]">{description}</span>
          ) : null}
        </div>
        {code ? <span className="text-[11px] text-[#979797]">{code}</span> : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function HandoffLink({ text, action }: { text: string; action: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-[12px]">
      <span className="text-primary">▲</span>
      <span className="flex-1">{text}</span>
      <Button variant="ghost" size="sm">
        {action}
      </Button>
    </div>
  )
}

function InlineNotice({ children, tone }: { children: React.ReactNode; tone: 'muted' | 'danger' }) {
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={
        tone === 'danger'
          ? 'rounded-md border border-destructive/40 px-3 py-2 text-[12px] text-destructive'
          : 'rounded-md border border-border px-3 py-2 text-[12px] text-muted-foreground'
      }
    >
      {children}
    </p>
  )
}

function Card({
  label,
  code,
  children,
}: {
  label: string
  code?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid content-start gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {code ? (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">{code}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function CollapsedToolbar({
  items,
  label,
  expandLabel,
}: {
  items: {
    id: string
    label: string
    detail: string
    state: 'done' | 'running' | 'idle'
    stateLabel: string
  }[]
  label: string
  expandLabel: string
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 rounded-md border border-border bg-secondary px-3 py-2 text-[12px]">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}:</span>
        {items.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-muted"
              >
                <SquareTerminal className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span>{item.label}</span>
                <span
                  className={
                    item.state === 'done'
                      ? 'text-emerald-400'
                      : item.state === 'running'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }
                >
                  {item.state === 'done' ? '✓' : item.state === 'running' ? '◌' : '○'}{' '}
                  {item.stateLabel}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{item.detail}</TooltipContent>
          </Tooltip>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto gap-1">
          <ChevronUp />
          {expandLabel}
        </Button>
      </div>
    </TooltipProvider>
  )
}

function markdownSample(x: {
  markdownTasks: readonly string[]
  tableHeaders: readonly string[]
  tableRows: readonly (readonly string[])[]
}) {
  return [
    `- [x] T01 · ${x.markdownTasks[0]}`,
    `- [ ] T02 · ${x.markdownTasks[1]}`,
    '',
    `| ${x.tableHeaders[0]} | ${x.tableHeaders[1]} |`,
    '| --- | --- |',
    `| ${x.tableRows[0][0]} | ${x.tableRows[0][1]} |`,
    `| ${x.tableRows[1][0]} | ${x.tableRows[1][1]} |`,
    '',
    '```ts',
    'const token = await auth.rotate(refreshToken)',
    '```',
  ].join('\n')
}

export function StyleguideSections({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const c = galleryCopy(locale)
  const mock = productMock(locale)
  const x = c.extra
  const sc = gallerySectionCopy(locale)
  const sec = sc.sections
  const w = locale === 'en' ? 'Section' : 'Seção'
  const roles = t.workflow.roles.map(([name]) => name)
  const diagram = `flowchart LR\n  research["${x.diagramNodes[0]}"] --> planner["${x.diagramNodes[1]}"]\n  planner --> implementer["${x.diagramNodes[2]}"]\n  classDef accent fill:#2a1f0a,stroke:#F5A623,color:#F5A623\n  class implementer accent`

  return (
    <div className="grid gap-10">
      <Section
        id="gallery-tokens"
        title={`${w} 1: ${sec.tokens.title}`}
        description={sec.tokens.description}
        code="base.tokens.json"
      >
        <div className="grid gap-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {sc.semanticColors}
          </span>
          <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
            {tokens.map(([name, value]) => (
              <div key={name} className="grid gap-1 rounded-md border border-border bg-card p-2">
                <span
                  className="h-12 rounded-sm border border-border"
                  style={{ background: value }}
                  aria-hidden="true"
                />
                <span className="pt-1 text-[12px]">{name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card label={sc.typography} code="typography.css">
              <div className="grid gap-3 font-mono">
                <span className="text-[18px] font-semibold">{sc.headingSample}</span>
                <span className="text-[13px]">{sc.bodySample}</span>
                <span className="text-[12px] font-medium">{sc.labelSample}</span>
                <span className="text-[11px] text-muted-foreground">{sc.metaSample}</span>
              </div>
            </Card>
            <Card label={sc.spacing} code="spacing.css">
              <div className="grid gap-2 font-mono text-[11px] text-muted-foreground">
                {[
                  [4, 'gap-1 / p-1'],
                  [8, 'gap-2 / p-2'],
                  [12, 'gap-3 / p-3'],
                  [16, 'gap-4 / p-4'],
                  [24, 'gap-6 / p-6'],
                  [32, 'gap-8 / p-8'],
                ].map(([space, token]) => (
                  <span key={space} className="flex items-center gap-3">
                    <span
                      className="h-2 rounded-sm bg-primary"
                      style={{ width: space }}
                      aria-hidden="true"
                    />
                    {space}px: {token}
                  </span>
                ))}
              </div>
            </Card>
            <Card label={sc.radii} code="radius.css">
              <div className="grid gap-2 text-[12px]">
                <span className="flex items-center justify-between">
                  {sc.radiusButtons}
                  <code className="rounded-[3px] border border-border px-1.5 font-mono text-[11px]">
                    rounded-[3px] (3px/4px)
                  </code>
                </span>
                <span className="flex items-center justify-between">
                  {sc.radiusComposer}
                  <code className="rounded-[4px] border border-border px-1.5 font-mono text-[11px]">
                    rounded-[4px]
                  </code>
                </span>
                <span className="flex items-center justify-between">
                  {sc.radiusBadges}
                  <code className="rounded-[2px] border border-primary/60 px-1.5 font-mono text-[11px] text-primary">
                    rounded-[2px]
                  </code>
                </span>
                <span className="pt-1 text-[11px] text-muted-foreground">{sc.radiusNote}</span>
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        id="gallery-primitives-section"
        title={`${w} 2: ${sec.primitives.title}`}
        description={sec.primitives.description}
        code="primitives.tsx"
      >
        <PrimitivesShowcase locale={locale} />
      </Section>

      <Section
        id="gallery-shell"
        title={`${w} 3: ${sec.shell.title}`}
        description={sec.shell.description}
        code="layout.scaffold.tsx"
      >
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <AppTopbar
              brand="FORJA v2.0"
              commandText="dev"
              settingsLabel={c.buttonLabels.secondary}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureTabs
              selectedId="login"
              items={[
                { id: 'login', label: mock.features[0], state: 'running' },
                { id: 'search', label: mock.features[1], state: 'idle' },
              ]}
              onSelect={() => {}}
              label={t.product.feature}
              stateLabels={{
                running: x.agentRunning,
                waiting: c.status.waiting,
                idle: c.status.draft,
              }}
            />
            <FeatureContext
              title={mock.features[0]}
              rows={[
                { label: t.product.destination, value: mock.targetPath },
                { label: t.product.branch, value: 'feature/login-oauth' },
                { label: 'Fluxo', value: roles.join(' → ') },
              ]}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <SidebarRow
              icon={<Terminal />}
              title={roles[2]}
              state="running"
              stateLabel={c.status.running}
              selected
            />
            <SidebarRow
              icon={<FolderGit2 />}
              title={mock.specName}
              state="approved"
              stateLabel={c.status.approved}
            />
            <SidebarRow icon={<Settings />} title={mock.skillName} />
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <AppStatusbar items={[mock.targetPath, 'UTF-8']} />
          </div>
        </div>
      </Section>

      <Section
        id="gallery-conversation"
        title={`${w} 4: ${sec.conversation.title}`}
        description={sec.conversation.description}
        code="conversation.bundle.tsx"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <Messages
              label={t.gallery.conversation}
              items={[
                { id: 'u', author: x.you, role: 'user', text: x.userMessage },
                { id: 'a', author: roles[2], role: 'agent', text: x.agentMessage },
              ]}
            />
            <HandoffLink text={x.handoff} action={x.viewRequest} />
          </div>
          <div className="grid content-start gap-3">
            <Composer
              recipients={mock.recipients}
              recipientId={mock.recipients[2].id}
              onRecipientChange={() => {}}
              featureLabel={mock.features[0]}
              targetLabel={mock.targetPath}
              value=""
              onChange={() => {}}
              onSend={() => {}}
              placeholder={mock.prompt}
              sendLabel={t.product.send}
            />
            <InlineNotice tone="muted">{t.product.empty}</InlineNotice>
            <InlineNotice tone="danger">{x.inlineError}</InlineNotice>
          </div>
        </div>
      </Section>

      <Section
        id="gallery-documents"
        title={`${w} 5: ${sec.documents.title}`}
        description={sec.documents.description}
        code="document.viewer.tsx"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Card label="DocumentHeader & ApprovalNotice" code="approval.status.tsx">
              <DocumentPreview
                name="SPEC.md"
                stateLabel={c.status.draft}
                actionLabel={x.approveSpec}
                notice={x.approvalNotice}
                noticeStatus={x.awaitingHuman}
              />
            </Card>
          </div>
          <Card label="MarkdownPreview + SelectionPopover" code="preview.md.tsx">
            <div className="relative grid gap-3 rounded-md border border-border bg-background p-4">
              <div className="relative flex items-center">
                <h4 className="font-mono text-[13px] font-semibold">{x.markdownTitle}</h4>
                <button
                  type="button"
                  className="absolute right-2 top-1 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-[12px] shadow-sm"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  {x.reviewSelection}
                </button>
              </div>
              <p className="text-[13px] leading-6 text-foreground/90">
                {x.selectionBefore}
                <mark className="rounded-sm border border-primary bg-primary/10 px-0.5 text-foreground">
                  {x.selectedPart}
                </mark>
                {x.selectionAfter}
              </p>
              <MarkdownPreview source={markdownSample(x)} />
            </div>
          </Card>
          <Card label="MermaidPreview (diagrama renderizado)" code="mermaid.render.tsx">
            <div className="grid gap-4 rounded-md border border-border bg-background p-6">
              <p className="text-center text-[11px] tracking-wider text-muted-foreground">
                {x.mermaidTitle}
              </p>
              <MermaidPreview source={diagram} errorLabel={x.inlineError} />
              <p className="mx-auto max-w-md text-center text-[12px] text-muted-foreground">
                {x.mermaidCaption}
              </p>
            </div>
          </Card>
        </div>
      </Section>

      <Section
        id="gallery-terminals"
        title={`${w} 6: ${sec.terminals.title}`}
        description={sec.terminals.description}
        code="terminals.panel.tsx"
      >
        <div className="grid gap-4">
          <TerminalPreview
            tabs={[
              { id: 'tests', label: x.tabTests, state: 'done', stateLabel: c.status.completed },
              { id: 'dev', label: x.tabDev, state: 'running', stateLabel: c.status.running },
              { id: 'zsh', label: x.tabShell, state: 'idle', stateLabel: '' },
            ]}
            activeId="dev"
            header={
              <div
                data-testid="gallery-terminal-preview"
                className="grid gap-2 border-b border-border px-3 py-2.5 text-[12px]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {x.agent}: <strong className="font-semibold">{roles[2]}</strong>
                  </span>
                  <span className="text-muted-foreground">· {x.viaMcp} ·</span>
                  <span className="text-primary">● {c.status.running}</span>
                  <span className="ml-auto font-mono">{x.command}: npm run dev</span>
                  <Button variant="outline" size="sm" className="rounded-md">
                    {x.stop}
                  </Button>
                </div>
              </div>
            }
            output={[]}
            emptyOutputLabel={t.product.terminal}
            cwd={mock.worktree}
            cwdLabel={x.cwd}
            addLabel={x.newTerminal}
            collapseLabel={x.collapseTerminals}
            tabsLabel={t.gallery.terminals}
          />
          <TerminalPreview
            tabs={[
              { id: 'hover', label: x.tabDev, state: 'idle', stateLabel: '', hovered: true },
              { id: 'focus', label: x.tabTests, state: 'idle', stateLabel: '', focused: true },
            ]}
            activeId=""
            output={[x.hoverSample]}
            tabsLabel={x.hoverFocusLabel}
          />
          <TerminalPreview
            tabs={[{ id: 'zsh', label: x.userTerminalLabel, state: 'idle', stateLabel: '' }]}
            activeId="zsh"
            output={[x.userPrompt]}
            tabsLabel={x.userTerminalLabel}
          />
          <CollapsedToolbar
            label={x.collapsedTerminals}
            expandLabel={x.expandPanel}
            items={[
              {
                id: 'tests',
                label: x.shortTests,
                detail: `${roles[2]} · npm test · ${mock.worktree}`,
                state: 'done',
                stateLabel: c.status.completed,
              },
              {
                id: 'dev',
                label: x.shortDev,
                detail: `${roles[2]} · npm run dev · ${mock.worktree}`,
                state: 'running',
                stateLabel: c.status.running,
              },
              {
                id: 'zsh',
                label: x.shortShell,
                detail: mock.worktree,
                state: 'idle',
                stateLabel: x.idle,
              },
            ]}
          />
          <p className="text-[12px] text-muted-foreground">{x.collapseNote}</p>
        </div>
      </Section>

      <Section id="gallery-notes" title={x.notesTitle} code="fidelity.rules.md">
        <ul className="grid gap-2 text-[13px] text-muted-foreground">
          {x.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

export function Styleguide({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const sc = gallerySectionCopy(locale)
  return (
    <div className="mx-auto min-h-screen w-[1280px] max-w-full border-x border-[#2A2A2A] bg-[#0E0E0E] pb-24 text-[#E6E6E6]">
      <header className="flex h-16 items-center justify-between border-b border-[#2A2A2A] bg-[#121214] px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-block size-2.5 rounded-sm bg-[#F5A623]" aria-hidden="true" />
            <h1 className="text-[18px] font-bold tracking-tight text-[#E6E6E6] uppercase">
              {t.gallery.title}
            </h1>
            <span className="rounded border border-[#2A2A2A] bg-[#1C1C1C] px-2 py-0.5 text-xs text-[#979797]">
              FORJA v2.0
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#979797]">{t.gallery.subtitle}</p>
        </div>
        <div className="text-right font-mono text-[11px] text-[#979797]">
          <div>{sc.headerStack}</div>
          <div className="text-[#E6E6E6]">{sc.headerRef}</div>
        </div>
      </header>
      <main className="space-y-12 p-8">
        <StyleguideSections locale={locale} />
      </main>
    </div>
  )
}
