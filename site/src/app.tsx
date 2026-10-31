import { resolvePage } from '@/shared/i18n'
import { Landing } from './pages/landing'
import { Styleguide } from './pages/styleguide'

export function App() {
  const route = resolvePage(window.location.pathname)
  if (route?.page === 'landing') return <Landing locale={route.locale} />
  if (route?.page === 'styleguide') return <Styleguide locale={route.locale} />
  return (
    <main className="grid min-h-screen place-items-center text-[13px] text-muted-foreground">
      <p>Page not found · Página não encontrada</p>
    </main>
  )
}
