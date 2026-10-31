import { renderToString } from 'react-dom/server'
import { App } from './app'

export function renderRoute(pathname: string): string {
  return renderToString(<App pathname={pathname} />)
}
