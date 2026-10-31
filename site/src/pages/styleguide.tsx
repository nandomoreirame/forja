import { Code, FileText, MessageCircle, Pencil, TriangleAlert, Zap } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { cn } from '@/shared/ui/utils'
import { ForjaMark } from '@/shared/ui'
import { Button } from '@/shared/ui'
import {
  AppStatusbar,
  AppTopbar,
  FeatureContext,
  FeatureTabs,
  SidebarRow,
} from '@/widgets/workbench'
import { Composer, Messages } from '@/widgets/conversation'
import {
  CollapsedToolbar,
  TerminalPreview,
  ToolbarDetail,
  type ToolbarItem,
} from '@/widgets/terminal'
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
    <div className="space-y-3 rounded-[3px] border border-border bg-card p-4">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-medium tracking-wider uppercase">{label}</span>
        {code ? <span>{code}</span> : null}
      </div>
      {children}
    </div>
  )
}

function InlineNotice({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode
  tone: 'muted' | 'danger'
  icon: 'chat' | 'alert'
}) {
  const Icon = icon === 'chat' ? MessageCircle : TriangleAlert
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-2.5 rounded-[3px] border p-3 text-[12px]',
        tone === 'danger'
          ? 'border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f]'
          : 'border-border bg-card text-muted-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
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
  const toolbarItems: ToolbarItem[] = [
    {
      id: 'tests',
      label: x.shortTests,
      detail: { agent: roles[2], command: 'npm test', dir: mock.worktree },
      state: 'done',
      stateLabel: c.status.completed,
    },
    {
      id: 'dev',
      label: x.shortDev,
      detail: { agent: roles[2], command: 'npm run dev', dir: mock.worktree },
      state: 'running',
      stateLabel: c.status.running,
    },
    {
      id: 'zsh',
      label: x.shortShell,
      detail: { dir: mock.worktree },
      state: 'idle',
      stateLabel: x.idle,
    },
  ]
  const detailLabels = {
    agent: x.agent,
    command: x.command,
    directory: sc.directory,
    hint: sc.clickToExpand,
  }
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
              <div className="grid gap-2">
                {[
                  [sc.headingSample, 'text-[18px] font-semibold', mock.features[0]],
                  [sc.bodySample, 'text-[13px]', x.userMessage],
                  [
                    sc.labelSample,
                    'text-[12px] font-medium uppercase text-muted-foreground',
                    c.textareaLabel,
                  ],
                  [
                    sc.metaSample,
                    'text-[11px] text-muted-foreground',
                    `${t.product.destination}: ${mock.targetPath} · ${t.product.branch}: feature/login-oauth`,
                  ],
                ].map(([name, style, sample], index, all) => (
                  <div
                    key={name}
                    className={index < all.length - 1 ? 'border-b border-border pb-2' : undefined}
                  >
                    <span className="block text-[11px] text-muted-foreground">{name}</span>
                    <span className={style}>{sample}</span>
                  </div>
                ))}
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
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{sc.topbarLabel}</span>
              <span>topbar.fragment.tsx</span>
            </div>
            <div className="overflow-hidden rounded-[3px] border border-border">
              <AppTopbar brand="FORJA" commandText="dev" settingsLabel={c.buttonLabels.secondary} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card label={sc.featureTabsLabel} code="features.tab.tsx">
              <FeatureTabs
                selectedId="login"
                items={[
                  { id: 'login', label: mock.features[0], state: 'running', tool: 'claude' },
                  { id: 'search', label: mock.features[1], state: 'waiting', tool: 'codex' },
                ]}
                onSelect={() => {}}
                label={t.product.feature}
                stateLabels={{
                  running: x.agentRunning,
                  waiting: c.status.waiting,
                  idle: c.status.draft,
                }}
              />
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-[3px] border border-border bg-secondary p-1.5">
                  <span className="block text-[10px] text-muted-foreground">{sc.hoverSample}:</span>
                  <span className="font-mono">bg-secondary + text-foreground</span>
                </div>
                <div className="rounded-[3px] border border-primary/40 bg-card p-1.5">
                  <span className="block text-[10px] text-primary">{sc.focusSample}:</span>
                  <span className="font-mono">ring-1 ring-ring</span>
                </div>
              </div>
            </Card>
            <Card label={sc.featureContextLabel} code="context.header.tsx">
              <div className="rounded-[3px] border border-border bg-background p-3">
                <FeatureContext
                  title={mock.features[0]}
                  mode={sc.guided}
                  rows={[
                    { label: t.product.destination, value: mock.targetPath },
                    { label: t.product.branch, value: 'feature/login-oauth' },
                  ]}
                  cycleLabel={sc.cycle}
                  cycle={roles.map((label, index) => ({
                    label,
                    state: index < 2 ? 'done' : index === 2 ? 'current' : 'pending',
                  }))}
                />
              </div>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card label={sc.sidebarLabel} code="sidebar.row.tsx">
              <div className="grid gap-1.5">
                <SidebarRow
                  icon={<Code />}
                  title={roles[2]}
                  state="running"
                  stateLabel={c.status.running}
                  selected
                />
                <SidebarRow
                  icon={<FileText />}
                  title={mock.specName}
                  state="approved"
                  stateLabel={c.status.approved}
                />
                <SidebarRow icon={<Zap />} title={mock.skillName} stateLabel={sc.active} />
              </div>
            </Card>
            <Card label={sc.statusbarLabel} code="statusbar.tsx">
              <div className="overflow-hidden rounded-[3px] border border-border">
                <AppStatusbar items={[mock.targetPath]} />
              </div>
              <p className="text-[11px] text-muted-foreground">{sc.statusbarNote}</p>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        id="gallery-conversation"
        title={`${w} 4: ${sec.conversation.title}`}
        description={sec.conversation.description}
        code="conversation.bundle.tsx"
      >
        <Card label={sc.convLabel}>
          <Messages
            label={sc.convLabel}
            items={[
              { id: 'u', author: x.you, role: 'user', text: x.userMessage },
              { id: 'h', author: roles[3], role: 'event', text: x.handoff, action: x.viewRequest },
              {
                id: 'a',
                author: roles[2],
                role: 'agent',
                text: x.agentMessage,
                status: sc.runningLabel,
                action: sc.interrupt,
              },
            ]}
          />
        </Card>
        <Card label={sc.composerLabel} code="composer.tsx">
          <Composer
            recipients={mock.recipients}
            recipientId={mock.recipients[2].id}
            onRecipientChange={() => {}}
            featureLabel={mock.features[0]}
            targetLabel={mock.targetPath}
            targetPrefix={t.product.destination}
            value=""
            onChange={() => {}}
            onSend={() => {}}
            placeholder={mock.prompt}
            contextLabel={sc.contextLabel}
            sendLabel={t.product.send}
            shortcutHint={sc.hintText}
          />
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <InlineNotice tone="muted" icon="chat">
            {t.product.empty}
          </InlineNotice>
          <InlineNotice tone="danger" icon="alert">
            {x.inlineError}
          </InlineNotice>
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
          <Card label={sc.mermaidLabel} code="mermaid.render.tsx">
            <div className="grid gap-4 rounded-md border border-border bg-background p-6">
              <p className="text-center text-[11px] tracking-wider text-muted-foreground">
                {x.mermaidTitle}
              </p>
              <MermaidPreview
                source={diagram}
                errorLabel={x.inlineError}
                loadingLabel={sc.mermaidLoading}
              />
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
              {
                id: 'tests',
                label: x.tabTests,
                state: 'done',
                stateLabel: c.status.completed,
                detail: 'npm test',
              },
              {
                id: 'dev',
                label: x.tabDev,
                state: 'running',
                stateLabel: c.status.running,
                detail: 'npm run dev',
              },
              {
                id: 'zsh',
                label: x.tabShell,
                state: 'idle',
                stateLabel: '',
                detail: mock.worktree,
              },
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
            output={['> forja@2.0.0 dev', '> electron-vite dev', '', t.product.terminal]}
            cwd={mock.worktree}
            cwdLabel={x.cwd}
            addLabel={x.newTerminal}
            collapseLabel={x.collapseTerminals}
            tabsLabel={t.gallery.terminals}
          />
          <Card label={sc.userTerminalLabel} code="user.terminal.tsx">
            <TerminalPreview
              tabs={[{ id: 'zsh', label: x.userTerminalLabel, state: 'idle', stateLabel: '' }]}
              activeId="zsh"
              output={[x.userPrompt]}
              tabsLabel={x.userTerminalLabel}
            />
          </Card>
          <Card label={sc.collapsedLabel} code="collapsed.toolbar.tsx">
            <CollapsedToolbar
              label={x.collapsedTerminals}
              expandLabel={x.expandPanel}
              detailLabels={detailLabels}
              items={toolbarItems}
            />
            <div className="grid gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {sc.hoverDetails}
              </span>
              <div className="w-fit rounded-[3px] border border-border bg-popover p-2.5 shadow-md">
                <ToolbarDetail item={toolbarItems[1]} labels={detailLabels} />
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">{x.collapseNote}</p>
          </Card>
        </div>
      </Section>

      <Section id="gallery-notes" title={`${w} 7: ${x.notesTitle}`} code="fidelity.rules.md">
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
    <div className="mx-auto min-h-screen w-[1280px] max-w-full border-x border-[#2A2A2A] bg-[#0E0E0E] text-[#E6E6E6]">
      <header className="flex h-16 items-center justify-between border-b border-[#2A2A2A] bg-[#121214] px-8">
        <div>
          <div className="flex items-center gap-3">
            <ForjaMark className="size-4 text-primary" />
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
      <footer className="flex items-center justify-between border-t border-[#2A2A2A] bg-[#121214] px-8 py-4 text-[11px] text-[#979797]">
        <span>{sc.footerTitle}</span>
        <span>{sc.footerMeta}</span>
      </footer>
    </div>
  )
}
