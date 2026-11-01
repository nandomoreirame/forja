import type { FeatureSnapshot, ProjectSnapshot } from '@/renderer/src/shared/api'

type Items = Pick<ProjectSnapshot, 'features' | 'artifacts'>
type Target = { kind: 'feature' | 'spec' | 'plan'; id: string }

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

function setArchived<T extends Items>(items: T, target: Target, archived: boolean): T {
  const feature =
    target.kind === 'feature' ? items.features.find((f) => f.id === target.id) : undefined
  const artifact =
    target.kind !== 'feature'
      ? items.artifacts.find((a) => a.id === target.id && a.kind === target.kind)
      : undefined
  if (!feature && !artifact) return items
  if (archived && (feature ?? artifact)?.archived) return items
  const features = items.features.map((f) =>
    f === feature && !!f.archived !== archived ? { ...f, archived } : f,
  )
  const artifacts = items.artifacts.map((a) => {
    const affected = feature
      ? a.featureId === feature.id
      : a === artifact ||
        (archived && artifact?.kind === 'spec' && a.kind === 'plan' && a.specId === artifact.id) ||
        (!archived && artifact?.kind === 'plan' && a.kind === 'spec' && a.id === artifact.specId)
    return affected && !!a.archived !== archived ? { ...a, archived } : a
  })
  if (
    features.every((f, i) => f === items.features[i]) &&
    artifacts.every((a, i) => a === items.artifacts[i])
  )
    return items
  return { ...items, features, artifacts }
}

export function archiveCascade<T extends Items>(items: T, target: Target): T {
  return setArchived(items, target, true)
}

export function restoreCascade<T extends Items>(items: T, target: Target): T {
  return setArchived(items, target, false)
}
