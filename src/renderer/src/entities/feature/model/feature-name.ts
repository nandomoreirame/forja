export function featureIdentity(prompt: string, existing: readonly string[]) {
  const line = prompt.trim().split(/\r?\n/)[0].replace(/\s+/g, ' ')
  if (!line) throw new Error('Empty prompt')
  const chars = Array.from(line)
  let kept = chars.slice(0, 40).join('')
  if (chars.length > 40 && chars[40] !== ' ' && kept.includes(' '))
    kept = kept.slice(0, kept.lastIndexOf(' '))
  kept = kept.trimEnd()
  const name = kept + (chars.length > 40 ? '…' : '')
  let base = kept
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (!/[a-z]/.test(base)) base = 'feature'
  let slug = base
  let suffix = 2
  const used = new Set(existing)
  while (used.has(slug)) slug = `${base}-${suffix++}`
  return { name, slug }
}
