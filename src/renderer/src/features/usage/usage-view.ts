import { getDictionary, type Locale } from '@/shared/i18n'
import type { ToolUsage } from '@/renderer/src/shared/api'
import type { ToolUsageView } from '@/widgets/usage'

/** Points within this distance of the elapsed share count as on pace. */
const paceTolerance = 2

function duration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days) return `${days}d${hours}h`
  if (hours) return `${hours}h${rest}m`
  return `${rest}m`
}

/** Formats structured plan usage into the AIBar-style labels of the usage widget. */
export function toUsageViews(
  usage: ToolUsage[],
  locale: Locale,
  now = new Date(),
): ToolUsageView[] {
  const t = getDictionary(locale).app.planUsage
  return usage.map((item) => {
    const fetched = item.fetchedAt ? Date.parse(item.fetchedAt) : Number.NaN
    // A missing or invalid time drops its label instead of printing NaN.
    const age = Number.isNaN(fetched) ? undefined : Math.round((now.getTime() - fetched) / 60_000)
    return {
      tool: item.tool,
      plan: item.plan,
      account: item.account,
      updatedLabel:
        age === undefined
          ? undefined
          : age < 1
            ? t.updatedNow
            : t.updatedAgo.replace('{minutes}', String(age)),
      windows: item.windows.map((window) => {
        const left = Date.parse(window.resetsAt) - now.getTime()
        const resetLabel = Number.isNaN(left)
          ? ''
          : left <= 0
            ? t.resetsNow
            : t.resetsIn.replace('{time}', duration(left))
        const points = Math.round(window.usedPercent - window.pacePercent)
        return {
          id: window.id,
          label: window.id === 'session' ? t.session : t.week,
          usedPercent: window.usedPercent,
          pacePercent: window.pacePercent,
          resetLabel,
          paceLabel:
            Math.abs(points) <= paceTolerance
              ? t.onPace
              : (points > 0 ? t.ahead : t.behind).replace('{points}', String(Math.abs(points))),
        }
      }),
    }
  })
}
