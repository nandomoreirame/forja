import { Fragment } from 'react'
import {
  ArrowRight,
  Circle,
  ClipboardList,
  Code2,
  ExternalLink,
  FlaskConical,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  SquareTerminal,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { galleryCopy } from '../mocks/gallery'
import { landingCopy } from '../mocks/landing-copy'
import { productMock } from '../mocks/product'
import { LocaleLink } from '../components/locale-link'

export const developmentUrl = 'https://github.com/nandomoreirame/forja'
export const issuesUrl = `${developmentUrl}/issues`
export const previewCommands = { dev: 'npm run dev', shell: 'zsh' } as const

const agentIcons = [Search, ClipboardList, Code2, FlaskConical, ShieldCheck]

function AnvilMark() {
  return (
    <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18v3l-3 2v2h2v4H4v-4h2v-2L3 8V5zm4 7h10v-1.5l2-1.33V7H5v2.17l2 1.33V12zM6 18h12v-2H6v2z" />
    </svg>
  )
}

function ProductMock({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const mock = productMock(locale)
  const copy = landingCopy(locale)
  const x = galleryCopy(locale).extra
  const agentStates = [copy.ready, copy.ready, copy.executing, copy.ready, copy.ready]

  return (
    <figure className="mt-14 w-full text-left" aria-label={t.hero.preview}>
      <div className="flex items-center justify-between rounded-t-sm border border-b-0 border-border bg-background px-3 py-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <span className="font-semibold text-foreground">forja-app-preview</span>
          <span className="text-muted-foreground/70">/dev/projects/forja</span>
        </div>
        <span className="rounded-sm border border-primary/20 bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
          {t.hero.preview}
        </span>
      </div>

      <div
        data-testid="product-preview"
        className="flex w-full flex-col overflow-hidden rounded-b-sm border border-border bg-background text-xs shadow-2xl"
      >
        <div className="flex h-10 items-center justify-between border-b border-border bg-secondary px-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-primary">
              <AnvilMark />
              FORJA <span className="text-[10px] font-normal text-muted-foreground">v2.0</span>
            </span>
            <span className="text-border" aria-hidden="true">
              |
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="text-primary">●</span> dev
            </span>
          </div>
          <div className="flex w-64 items-center justify-between rounded-sm border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 text-muted-foreground/70">
              <Search className="size-3" aria-hidden="true" /> dev
            </span>
            <span className="rounded-sm border border-border px-1 text-[10px] text-muted-foreground/70">
              Ctrl+Shift+P
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">UTF-8</span>
        </div>

        <div className="flex h-9 items-center justify-between overflow-x-auto border-b border-border bg-background px-3">
          <div className="flex items-center gap-1" role="tablist" aria-label={copy.tabsLabel}>
            <div
              role="tab"
              aria-selected="true"
              className="flex items-center gap-2 border-x border-t-2 border-border border-t-primary bg-card px-3 py-1.5 text-[11px] font-medium text-foreground"
            >
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              <span>{mock.features[0]}</span>
              <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                {mock.roles[2]} · {mock.statusLabels.running}
              </span>
            </div>
            <div
              role="tab"
              aria-selected="false"
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <span className="size-2 rounded-full bg-muted-foreground/70" aria-hidden="true" />
              <span>{mock.features[1]}</span>
              <span className="text-[10px] text-muted-foreground/70">
                {galleryCopy(locale).status.waiting}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              {copy.target}: <span className="text-foreground">{mock.targetPath}</span>
            </span>
            <span>
              {copy.branch}: <span className="font-mono text-primary">feature/login-oauth</span>
            </span>
          </div>
        </div>

        <div className="flex min-h-[460px] flex-col bg-background lg:flex-row">
          <aside className="flex w-full flex-col gap-4 border-b border-border bg-background p-3 lg:w-56 lg:border-b-0 lg:border-r">
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                <span>{copy.agents}</span>
                <span className="text-muted-foreground">5</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {mock.roles.map((role, index) => {
                  const Icon = agentIcons[index]
                  const active = index === 2
                  return (
                    <div
                      key={role}
                      className={
                        active
                          ? 'flex items-center justify-between rounded-r-sm border-l-2 border-primary bg-primary/15 px-1.5 py-1 font-semibold text-primary'
                          : 'flex items-center justify-between py-1 text-muted-foreground'
                      }
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {role}
                      </span>
                      <span
                        className={
                          active
                            ? 'text-[10px] text-primary'
                            : 'text-[10px] text-muted-foreground/70'
                        }
                      >
                        {agentStates[index]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {copy.specs}
              </div>
              <div className="flex items-center justify-between py-1 text-[11px] text-muted-foreground">
                <span className="truncate">{mock.specName}</span>
                <span className="rounded-sm border border-emerald-800/40 bg-emerald-950/40 px-1 text-[9px] text-emerald-400">
                  {copy.approved}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {copy.plans}
              </div>
              <div className="flex items-center justify-between py-1 text-[11px] text-muted-foreground">
                <span className="truncate">login-oauth.md</span>
                <span className="rounded-sm border border-emerald-800/40 bg-emerald-950/40 px-1 text-[9px] text-emerald-400">
                  {copy.approved}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {copy.reviews}
              </div>
              <div className="flex items-center justify-between py-1 text-[11px] text-primary">
                <span className="truncate">login-oauth-rev.md</span>
                <span className="rounded-sm border border-primary/30 bg-primary/15 px-1 text-[9px] text-primary">
                  {copy.correction}
                </span>
              </div>
            </div>
          </aside>

          <div className="flex flex-1 flex-col gap-3 bg-background p-4">
            <div className="flex items-center justify-between rounded-sm border border-border bg-card p-2.5 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground">{copy.cycle}</span>
                <div className="flex items-center gap-2">
                  {mock.roles.map((role, index) => (
                    <Fragment key={role}>
                      {index > 0 ? <span className="text-muted-foreground/70">→</span> : null}
                      <span
                        className={
                          index < 2
                            ? 'font-medium text-emerald-400'
                            : index === 2
                              ? 'rounded-sm border border-primary/30 bg-primary/15 px-1.5 py-0.5 font-bold text-primary'
                              : 'text-muted-foreground'
                        }
                      >
                        {index < 2 ? `${role} ✓` : index === 2 ? `● ${role}` : role}
                      </span>
                    </Fragment>
                  ))}
                </div>
              </div>
              <span className="rounded-sm border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                {copy.guided}
              </span>
            </div>

            <div className="grid max-h-[220px] gap-2.5 overflow-hidden rounded-sm border border-border bg-background/60 p-2">
              <div className="rounded-sm border border-border bg-card p-2">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
                  <span className="font-semibold text-foreground">{copy.you}</span>
                  <span>14:22</span>
                </div>
                <p className="text-[11px] text-foreground">{mock.messageUser}</p>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-primary/40 bg-primary/15 px-2 py-1.5 text-[11px] text-primary">
                <span className="flex items-center gap-2">
                  <TriangleAlert className="size-3.5" aria-hidden="true" />
                  {copy.handoffRequest}
                </span>
                <span className="cursor-pointer text-[10px] underline">{copy.viewRequest}</span>
              </div>
              <div className="rounded-sm border border-border bg-secondary p-2">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
                  <span className="font-semibold text-primary">{copy.agentLabel}</span>
                  <span className="rounded-sm bg-primary/15 px-1 text-primary">
                    {mock.statusLabels.running}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{mock.messageAgent}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-sm border border-border bg-card p-2.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 font-semibold text-foreground">
                    <span className="text-primary">●</span> {copy.recipient}
                    <ChevronDown className="size-3" aria-hidden="true" />
                  </span>
                  <span>
                    {copy.context}: <strong className="text-foreground">{mock.features[0]}</strong>
                  </span>
                </div>
                <span>
                  {t.product.target}: {mock.targetPath}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-border bg-background p-2 text-[11px] text-muted-foreground">
                <span>{mock.prompt}</span>
                <span className="text-[10px] text-muted-foreground/70">Ctrl+Enter</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-sm border border-border bg-background">
              <div className="flex h-7 items-center justify-between border-b border-border bg-secondary px-2">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 border-t border-primary bg-background px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    <SquareTerminal className="size-3" aria-hidden="true" />
                    <span>{mock.terminals[1]}</span>
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                    <SquareTerminal className="size-3" aria-hidden="true" />
                    <span>{mock.terminals[0]}</span>
                    <span className="text-[9px] text-emerald-400">{mock.stateCompleted}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                    <SquareTerminal className="size-3" aria-hidden="true" />
                    <span>{mock.terminals[2]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Plus
                    className="size-3 cursor-pointer hover:text-foreground"
                    aria-label={t.product.feature}
                  />
                  <ChevronDown
                    className="size-3 cursor-pointer hover:text-foreground"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="p-2.5 font-sans text-[10.5px] leading-relaxed text-muted-foreground">
                <div className="mb-1 flex items-center justify-between border-b border-border/60 pb-1 text-[10px] text-muted-foreground/70">
                  <span>
                    {t.product.feature}:{' '}
                    <strong className="text-foreground">{copy.recipient}</strong> · {copy.via}
                  </span>
                  <span>
                    {copy.command}: <code className="text-primary">npm run dev</code>
                  </span>
                  <button
                    type="button"
                    className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[9px] text-foreground hover:bg-secondary"
                  >
                    {copy.stop}
                  </button>
                </div>
                {copy.sampleOutput.map((line) => (
                  <div key={line} className="text-foreground">
                    {line}
                  </div>
                ))}
                <div className="mt-0.5 text-muted-foreground/70">{copy.waiting}</div>
              </div>
            </div>
          </div>

          <aside className="flex w-full flex-col gap-3 border-t border-border bg-background p-3 text-[11px] lg:w-56 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <span>{copy.gitInspector}</span>
              <span className="text-primary">feature</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>{copy.repository}:</span>
                <span className="font-semibold text-foreground">forja</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{copy.worktree}:</span>
                <span className="max-w-[100px] truncate text-foreground" title={mock.worktree}>
                  .../login-oauth
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{copy.branch}:</span>
                <span className="text-primary">feat/oauth</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{copy.target}:</span>
                <span className="text-foreground">release/2.0</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{copy.changes}:</span>
                <span className="font-semibold text-amber-400">+18 -4</span>
              </div>
            </div>
            <div className="space-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
              <div className="font-semibold uppercase text-muted-foreground/70">
                {copy.verifications}
              </div>
              <div className="flex justify-between text-foreground">
                <span>{copy.tests}</span>
                <span className="text-primary">● {mock.statusLabels.running}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{copy.review}</span>
                <span className="text-muted-foreground/70">{copy.pending}</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex h-7 items-center justify-between border-t border-border bg-secondary px-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-foreground">
              <SquareTerminal className="size-3" aria-hidden="true" />
              {mock.targetPath}
            </span>
            <span className="text-border" aria-hidden="true">
              |
            </span>
            <span>{copy.terminals}</span>
            <span className="text-emerald-400">✓ {mock.terminals[0]}</span>
            <span className="font-semibold text-primary">● {mock.terminals[1]} ↻</span>
            <span className="text-muted-foreground/70">
              {mock.terminals[2]} {copy.idle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>UTF-8</span>
            <span className="flex items-center gap-1 text-muted-foreground/70">
              <ChevronUp className="size-3" aria-hidden="true" /> {copy.collapsePanel}
            </span>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">{x.selectedPart}</figcaption>
    </figure>
  )
}

export function Landing({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const mock = productMock(locale)
  const copy = landingCopy(locale)
  const x = galleryCopy(locale).extra
  const otherLocale: Locale = locale === 'en' ? 'pt-br' : 'en'

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-card focus:px-3 focus:py-2"
      >
        {t.nav.skip}
      </a>

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5 text-foreground hover:text-primary">
            <AnvilMark />
            <span className="text-sm font-bold tracking-wide">
              FORJA <span className="font-normal text-muted-foreground">v2.0</span>
            </span>
          </a>
          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 text-xs text-muted-foreground md:flex"
          >
            <a href="#why" className="hover:text-foreground">
              {t.nav.why}
            </a>
            <a href="#workflow" className="hover:text-foreground">
              {t.nav.workflow}
            </a>
            <a href="#planned" className="hover:text-foreground">
              {t.nav.planned}
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <LocaleLink
              page="landing"
              target={otherLocale}
              label={t.nav.localeSwitch}
              className="text-xs text-muted-foreground hover:text-foreground"
            />
            <a
              href={developmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <span>{t.nav.follow}</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="w-full flex-1">
        <section className="w-full border-b border-border/60 pt-16 pb-20">
          <div className="mx-auto flex max-w-[1120px] flex-col items-center px-6 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] font-medium tracking-wider text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              <span>{t.hero.status}</span>
            </div>
            <h1 className="max-w-[860px] text-3xl leading-tight font-bold tracking-tight text-foreground md:text-4xl lg:text-[42px]">
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-[760px] text-sm leading-relaxed text-muted-foreground md:text-base">
              {t.hero.objective}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <a
                href={developmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/80"
              >
                <span>{t.nav.follow}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
              <span className="text-[11px] text-muted-foreground/70">{t.hero.note}</span>
            </div>
            <ProductMock locale={locale} />
          </div>
        </section>

        <section
          id="why"
          aria-labelledby="why-title"
          className="w-full border-b border-border/60 py-20"
        >
          <div className="mx-auto max-w-[1120px] px-6">
            <div className="max-w-[780px]">
              <p className="mb-3 text-xs font-semibold tracking-wider text-primary uppercase">
                {t.why.eyebrow}
              </p>
              <h2
                id="why-title"
                className="text-2xl leading-snug font-bold tracking-tight md:text-3xl"
              >
                {t.why.title}
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
                {t.why.body}
              </p>
              <p className="mt-4 border-l-2 border-primary py-1 pl-4 text-sm leading-relaxed font-medium text-foreground md:text-base">
                {t.why.close}
              </p>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          aria-labelledby="workflow-title"
          className="w-full border-b border-border/60 bg-background/50 py-20"
        >
          <div className="mx-auto max-w-[1120px] px-6">
            <div className="mb-12 max-w-[780px]">
              <p className="mb-3 text-xs font-semibold tracking-wider text-primary uppercase">
                {t.workflow.eyebrow}
              </p>
              <h2 id="workflow-title" className="text-2xl font-bold tracking-tight md:text-3xl">
                {t.workflow.title}
              </h2>
            </div>
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {t.workflow.roles.map(([name, line], index) => (
                <li
                  key={name}
                  className={
                    index === 2
                      ? 'relative flex h-full flex-col justify-between rounded-sm border border-primary/40 bg-primary/10 p-4'
                      : 'relative flex h-full flex-col justify-between rounded-sm border border-border bg-card p-4'
                  }
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                        {String(index + 1).padStart(2, '0')} · {name}
                      </span>
                    </div>
                    <p className="text-xs leading-snug font-medium text-foreground">{line}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-sm border border-border bg-card p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">{t.workflow.close}</p>
              <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                <Lock className="size-3.5" aria-hidden="true" />
                {t.product.approved}
              </span>
            </div>
          </div>
        </section>

        <section
          id="planned"
          aria-labelledby="planned-title"
          className="w-full border-b border-border/60 py-20"
        >
          <div className="mx-auto max-w-[1120px] px-6">
            <div className="mb-14 max-w-[780px]">
              <p className="mb-3 text-xs font-semibold tracking-wider text-primary uppercase">
                {t.features.eyebrow}
              </p>
              <h2 id="planned-title" className="text-2xl font-bold tracking-tight md:text-3xl">
                {t.features.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {t.features.items.map(([title, body], index) => (
                <article
                  key={title}
                  className="flex flex-col justify-between space-y-5 rounded-sm border border-border bg-card p-6"
                >
                  <div>
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                  {index === 0 ? (
                    <div className="space-y-2 rounded-sm border border-border bg-background p-3">
                      <div className="flex items-center gap-1 border-b border-border pb-2">
                        <div className="flex items-center gap-2 border-b-2 border-primary bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground">
                          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                          <span>{copy.planned[0]}</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1 text-[11px] text-muted-foreground">
                          <Circle className="size-1.5 fill-current" aria-hidden="true" />
                          <span>{copy.planned[1]}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 font-sans text-[10px] text-muted-foreground">
                        <span>
                          {t.product.destination}:{' '}
                          <span className="text-foreground">{mock.worktree}</span>
                        </span>
                        <span className="text-primary">{t.product.branch}: feat/session</span>
                      </div>
                    </div>
                  ) : null}
                  {index === 1 ? (
                    <div className="relative space-y-2 rounded-sm border border-border bg-background p-3">
                      <div className="flex items-center justify-between border-b border-border pb-1.5 font-sans text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{copy.docId}</span>
                        <span className="rounded-sm border border-emerald-800/40 bg-emerald-950/30 px-1 text-emerald-400">
                          {copy.approved}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-foreground">
                        {x.selectionBefore}
                        <mark className="rounded-sm border border-primary bg-primary/10 px-0.5 text-foreground">
                          {x.selectedPart}
                        </mark>
                        {x.selectionAfter}
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2 py-1 text-[10px]">
                        {x.reviewSelection}
                      </span>
                    </div>
                  ) : null}
                  {index === 2 ? (
                    <div className="space-y-2 rounded-sm border border-border bg-background p-3">
                      <div className="flex items-center gap-1 border-b border-border pb-2">
                        <div className="flex items-center gap-1.5 border-t border-primary bg-card px-2.5 py-1 text-[10px] font-semibold text-primary">
                          <SquareTerminal className="size-3" aria-hidden="true" />
                          {mock.terminals[1]}
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground">
                          <SquareTerminal className="size-3" aria-hidden="true" />
                          {mock.terminals[0]}
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground">
                          <SquareTerminal className="size-3" aria-hidden="true" />
                          {mock.terminals[2]}
                        </div>
                        <Plus className="ml-auto size-3 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div className="flex items-center justify-between font-sans text-[10px] text-muted-foreground">
                        <span className="truncate">{mock.targetPath}</span>
                        <span>
                          {copy.terminals} {mock.terminals[0]} ✓ · {mock.terminals[1]} ●
                        </span>
                      </div>
                    </div>
                  ) : null}
                  {index === 3 ? (
                    <div className="space-y-2 rounded-sm border border-border bg-background p-3">
                      {mock.roles.map((role, roleIndex) => (
                        <div
                          key={role}
                          className={
                            roleIndex === 2
                              ? 'flex items-center justify-between rounded-sm border-l-2 border-primary bg-primary/10 px-2 py-1 text-[11px] text-primary'
                              : 'flex items-center justify-between rounded-sm px-2 py-1 text-[11px] text-muted-foreground'
                          }
                        >
                          <span>{role}</span>
                          <span className="text-[10px]">{copy.skillsLabel}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{t.features.integrations}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">{t.features.qualification}</p>
          </div>
        </section>

        <section
          aria-labelledby="scope-title"
          className="w-full border-b border-border/60 bg-background/40 py-20"
        >
          <div className="mx-auto max-w-[1120px] px-6">
            <div className="mb-12 max-w-[780px]">
              <h2 id="scope-title" className="text-2xl font-bold tracking-tight md:text-3xl">
                {t.scope.title}
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground md:text-sm">
                {t.scope.body}
              </p>
            </div>
            <div className="max-w-[860px] space-y-4">
              {t.scope.faq.map(([question, answer]) => (
                <article key={question} className="rounded-sm border border-border bg-card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <span className="text-primary">Q:</span> {question}
                  </h3>
                  <p className="mt-2 pl-6 text-xs leading-relaxed text-muted-foreground md:text-sm">
                    {answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="w-full bg-background py-20">
          <div className="mx-auto flex max-w-[1120px] flex-col items-center px-6 text-center">
            <h2 id="cta-title" className="text-2xl font-bold tracking-tight md:text-3xl">
              {t.footer.title}
            </h2>
            <p className="mt-3 max-w-[620px] text-sm leading-relaxed text-muted-foreground">
              {t.footer.objective}
            </p>
            <div className="mt-8">
              <a
                href={developmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/80"
              >
                <span>{t.nav.follow}</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-border bg-background py-8 text-xs">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-6 text-muted-foreground">
          <span className="font-bold text-foreground">Forja 2.0</span>
          <span>{t.footer.status}</span>
          <div className="ml-auto flex gap-4">
            <a
              href={developmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {t.footer.source}
            </a>
            <a
              href={issuesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {t.footer.issues}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
