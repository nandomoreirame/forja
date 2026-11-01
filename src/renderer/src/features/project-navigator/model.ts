import type { FeatureSnapshot } from '@/renderer/src/shared/api'

export function groupFeatures(features: readonly FeatureSnapshot[]) {
  const groups = {
    attention: [] as FeatureSnapshot[],
    running: [] as FeatureSnapshot[],
    idle: [] as FeatureSnapshot[],
    finished: [] as FeatureSnapshot[],
  }
  for (const feature of features) {
    if (feature.archived) continue
    const group = feature.endState
      ? 'finished'
      : feature.stalled || feature.state === 'waiting' || feature.state === 'failed'
        ? 'attention'
        : feature.state === 'running'
          ? 'running'
          : 'idle'
    groups[group].push(feature)
  }
  for (const group of Object.values(groups)) {
    group.sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt))
  }
  return groups
}

export { archiveCascade, restoreCascade } from '@/renderer/src/shared/lib/archive'
