import { ArrowRight, CircleCheck, FolderGit2, Terminal } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { Badge, Button } from '@/shared/ui'
import {
  AppStatusbar,
  AppTopbar,
  FeatureContext,
  FeatureTabs,
  SidebarRow,
} from '@/widgets/workbench'
import { Composer, Messages } from '@/widgets/conversation'
import { TerminalPreview } from '@/widgets/terminal'
import { productMock } from '../mocks/product'
import { LocaleLink } from '../components/locale-link'

export const developmentUrl = 'https://github.com/nandomoreirame/forja'
export const issuesUrl = `${developmentUrl}/issues`
export const previewCommands = { dev: 'npm run dev', shell: 'zsh' } as const

function ProductPreview({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const mock = productMock(locale)
  return (
    <figure aria-label={t.hero.preview} className="grid gap-3">
      <div
        data-testid="product-preview"
        className="grid overflow-hidden rounded-lg border border-border bg-background shadow-sm"
      >
        <AppTopbar brand="FORJA v2.0" commandText="dev" settingsLabel={t.product.feature} />
        <FeatureTabs
          selectedId="login"
          items={[
            { id: 'login', label: mock.features[0], state: 'running' },
            { id: 'search', label: mock.features[1], state: 'waiting' },
          ]}
          onSelect={() => {}}
          label={t.product.feature}
        />
        <div className="grid min-h-80 grid-cols-[200px_1fr] border-b border-border">
          <aside className="grid content-start gap-1 border-r border-border bg-sidebar p-2">
            <SidebarRow
              icon={<Terminal />}
              title={mock.roles[2]}
              state="running"
              stateLabel={mock.stateRunning}
              selected
            />
            <SidebarRow
              icon={<FolderGit2 />}
              title={mock.specName}
              state="approved"
              stateLabel={mock.statusLabels.approved}
            />
            <SidebarRow icon={<CircleCheck />} title={mock.skillName} />
          </aside>
          <div className="grid content-start">
            <FeatureContext
              title={mock.features[0]}
              rows={[
                { label: mock.labels.target, value: mock.targetPath },
                { label: mock.labels.branch, value: 'feature/login-oauth' },
                { label: mock.labels.cwd, value: mock.worktree },
              ]}
            />
            <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2 text-[12px]">
              {mock.rpiSteps.map((step, index) => (
                <Badge
                  key={step}
                  variant={index === 2 ? 'default' : 'outline'}
                  className="text-[11px]"
                >
                  {step}
                </Badge>
              ))}
            </div>
            <Messages
              items={[
                { id: 'u1', author: mock.labels.feature, role: 'user', text: mock.messageUser },
                { id: 'a1', author: mock.roles[2], role: 'agent', text: mock.messageAgent },
              ]}
            />
            <div className="p-3">
              <TerminalPreview
                tabs={[
                  {
                    id: 'tests',
                    label: mock.terminals[0],
                    state: 'done',
                    stateLabel: mock.stateCompleted,
                  },
                  {
                    id: 'dev',
                    label: mock.terminals[1],
                    state: 'running',
                    stateLabel: mock.stateRunning,
                  },
                  {
                    id: 'zsh',
                    label: mock.terminals[2],
                    state: 'idle',
                    stateLabel: mock.stateIdle,
                  },
                ]}
                activeId="dev"
                output={[...mock.output]}
                cwd={mock.worktree}
                cwdLabel={mock.cwd}
              />
            </div>
            <div className="p-3 pt-0">
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
                sendLabel={mock.labels.send}
              />
            </div>
          </div>
        </div>
        <AppStatusbar items={[mock.targetPath, 'UTF-8']} />
      </div>
      <figcaption className="text-[12px] text-muted-foreground">{t.hero.preview}</figcaption>
    </figure>
  )
}

export function Landing({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const otherLocale: Locale = locale === 'en' ? 'pt-br' : 'en'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:bg-card focus:px-3 focus:py-2"
      >
        {t.nav.skip}
      </a>
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 px-6 text-[13px]"
        >
          <a href="/" className="flex items-center gap-2 font-medium">
            <span aria-hidden="true" className="text-primary">
              ▲
            </span>
            Forja 2.0
          </a>
          <div className="hidden items-center gap-5 text-muted-foreground md:flex">
            <a href="#why" className="hover:text-foreground">
              {t.nav.why}
            </a>
            <a href="#workflow" className="hover:text-foreground">
              {t.nav.workflow}
            </a>
            <a href="#planned" className="hover:text-foreground">
              {t.nav.planned}
            </a>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <LocaleLink
              page="landing"
              target={otherLocale}
              label={t.nav.localeSwitch}
              className="text-muted-foreground hover:text-foreground"
            />
            <Button asChild size="sm" variant="outline">
              <a href={developmentUrl} rel="noreferrer noopener" target="_blank">
                {t.nav.follow}
              </a>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main" className="mx-auto grid max-w-[1120px] gap-24 px-6 pb-24 pt-16">
        <section aria-labelledby="hero-title" className="grid gap-6">
          <p className="text-[12px] tracking-[0.2em] text-primary">{t.hero.status}</p>
          <h1
            id="hero-title"
            className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight"
          >
            {t.hero.title}
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {t.hero.objective}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild>
              <a href={developmentUrl} rel="noreferrer noopener" target="_blank">
                {t.nav.follow}
                <ArrowRight />
              </a>
            </Button>
            <p className="text-[12px] text-muted-foreground">{t.hero.note}</p>
          </div>
          <ProductPreview locale={locale} />
        </section>

        <section id="why" aria-labelledby="why-title" className="grid max-w-3xl gap-4">
          <p className="text-[12px] tracking-[0.2em] text-primary">{t.why.eyebrow}</p>
          <h2 id="why-title" className="text-2xl font-semibold tracking-tight">
            {t.why.title}
          </h2>
          <p className="text-[15px] leading-7 text-muted-foreground">{t.why.body}</p>
          <p className="text-[15px] leading-7">{t.why.close}</p>
        </section>

        <section id="workflow" aria-labelledby="workflow-title" className="grid gap-6">
          <p className="text-[12px] tracking-[0.2em] text-primary">{t.workflow.eyebrow}</p>
          <h2 id="workflow-title" className="text-2xl font-semibold tracking-tight">
            {t.workflow.title}
          </h2>
          <ol className="grid gap-3 md:grid-cols-5">
            {t.workflow.roles.map(([name, line], index) => (
              <li key={name} className="grid gap-2 border-t border-border pt-4">
                <span className="text-[12px] text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[15px] font-medium">{name}</h3>
                <p className="text-[13px] leading-6 text-muted-foreground">{line}</p>
              </li>
            ))}
          </ol>
          <p className="max-w-3xl text-[14px] leading-7 text-muted-foreground">
            {t.workflow.close}
          </p>
        </section>

        <section id="planned" aria-labelledby="planned-title" className="grid gap-8">
          <p className="text-[12px] tracking-[0.2em] text-primary">{t.features.eyebrow}</p>
          <h2 id="planned-title" className="text-2xl font-semibold tracking-tight">
            {t.features.title}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {t.features.items.map(([title, body]) => (
              <article
                key={title}
                className="grid gap-2 rounded-lg border border-border bg-card p-5"
              >
                <h3 className="text-[15px] font-medium">{title}</h3>
                <p className="text-[13px] leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">{t.features.integrations}</p>
          <p className="text-[12px] text-muted-foreground">{t.features.qualification}</p>
        </section>

        <section aria-labelledby="scope-title" className="grid gap-6">
          <h2 id="scope-title" className="text-2xl font-semibold tracking-tight">
            {t.scope.title}
          </h2>
          <p className="max-w-3xl text-[15px] leading-7 text-muted-foreground">{t.scope.body}</p>
          <div className="grid gap-2">
            {t.scope.faq.map(([question, answer]) => (
              <details
                key={question}
                className="group rounded-lg border border-border bg-card px-5 py-4"
              >
                <summary className="cursor-pointer text-[15px] font-medium">{question}</summary>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-title" className="grid gap-5 border-t border-border pt-16">
          <h2 id="cta-title" className="text-2xl font-semibold tracking-tight">
            {t.footer.title}
          </h2>
          <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {t.footer.objective}
          </p>
          <div>
            <Button asChild>
              <a href={developmentUrl} rel="noreferrer noopener" target="_blank">
                {t.nav.follow}
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-6 py-6 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">Forja 2.0</span>
          <span>{t.footer.status}</span>
          <div className="ml-auto flex gap-4">
            <a
              href={developmentUrl}
              rel="noreferrer noopener"
              target="_blank"
              className="hover:text-foreground"
            >
              {t.footer.source}
            </a>
            <a
              href={issuesUrl}
              rel="noreferrer noopener"
              target="_blank"
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
