export type FeatureFlag = 'explorer' | 'source-control' | 'backlog-board'
type Env = { PROD?: boolean; DEV?: boolean }
export function flagDefaults(env: Env): Record<FeatureFlag, boolean> {
  const on = !env.PROD
  return { explorer: on, 'source-control': on, 'backlog-board': on }
}
let overrides: Partial<Record<FeatureFlag, boolean>> = {}
/** Test-only: force flags on or off. */
export function overrideFlags(next: Partial<Record<FeatureFlag, boolean>>) {
  overrides = next
}
export function isEnabled(flag: FeatureFlag): boolean {
  return overrides[flag] ?? flagDefaults(import.meta.env)[flag]
}
