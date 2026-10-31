import { ArrowRight, ExternalLink, Lock } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { productMock } from '../mocks/product'
import { LocaleLink } from '../components/locale-link'

export const developmentUrl = 'https://github.com/nandomoreirame/forja'
export const followUrl = `${developmentUrl}/tree/release/2.0`
export const issuesUrl = `${developmentUrl}/issues`
export const previewCommands = { dev: 'npm run dev', shell: 'zsh' } as const

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
  return (
    <figure data-testid="product-preview" className="mt-14 w-full text-left">
      <img
        src="/stitch/execution-terminals.jpg"
        alt={`${t.hero.preview}: ${mock.features[0]} · ${mock.roles[2]}`}
        width={1280}
        height={1024}
        loading="lazy"
        className="block h-auto w-full rounded-sm border border-border shadow-2xl"
      />
      <p className="sr-only">
        {mock.features[0]} · {mock.roles[2]} · {mock.statusLabels.running} · {mock.prompt} ·{' '}
        {mock.targetPath}
      </p>
    </figure>
  )
}

export function Landing({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const otherLocale: Locale = locale === 'en' ? 'pt-br' : 'en'

  return (
    <div className="min-h-screen bg-[#131314] font-sans text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-card focus:px-3 focus:py-2"
      >
        {t.nav.skip}
      </a>

      <header className="sticky top-0 z-50 w-full border-b border-border bg-[#131314]/95 backdrop-blur-sm">
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
              href={followUrl}
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
                href={followUrl}
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
                    <img
                      src={`/stitch/cards/${locale}/tab-per-feature.png`}
                      alt={
                        locale === 'en'
                          ? 'Feature tabs: Renew session, Quick search'
                          : 'Abas de feature: Renovar sessão, Busca rápida'
                      }
                      loading="lazy"
                      className="h-[180px] w-full rounded-sm object-contain"
                    />
                  ) : null}
                  {index === 1 ? (
                    <img
                      src={`/stitch/cards/${locale}/documents.png`}
                      alt={
                        locale === 'en'
                          ? 'SPEC-042 document with the selected passage and the Review with agent action'
                          : 'Documento SPEC-042 com o trecho selecionado e a ação Revisar com o agente'
                      }
                      loading="lazy"
                      className="h-[180px] w-full rounded-sm object-contain"
                    />
                  ) : null}
                  {index === 2 ? (
                    <img
                      src={`/stitch/cards/${locale}/execution.png`}
                      alt={
                        locale === 'en'
                          ? 'Agent terminals: dev, tests and zsh with the collapsed footer'
                          : 'Terminais do agente: dev, testes e zsh com o rodapé recolhido'
                      }
                      loading="lazy"
                      className="h-[180px] w-full rounded-sm object-contain"
                    />
                  ) : null}
                  {index === 3 ? (
                    <img
                      src={`/stitch/cards/${locale}/tools.png`}
                      alt={
                        locale === 'en'
                          ? 'Roles and CLI configuration: Implementer (Codex) and Reviewer (agy)'
                          : 'Papéis e CLIs configuradas: Implementador (Codex) e Revisor (agy)'
                      }
                      loading="lazy"
                      className="h-[180px] w-full rounded-sm object-contain"
                    />
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
                href={followUrl}
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
