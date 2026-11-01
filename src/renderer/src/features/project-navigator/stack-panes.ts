type Layout = Record<string, number>

// Below this a pane is still at its header size (percentages carry float noise).
const epsilon = 0.5

/**
 * VS Code pane stacking: while any pane is open, open panes share all free height and
 * collapsed headers sit at the bottom; with every pane collapsed, the filler takes the free
 * height so the headers stack at the top. Returns null when the layout already fits.
 */
export function stackPanes(layout: Layout, headerSize: number, fillerId: string): Layout | null {
  const panes = Object.keys(layout).filter((id) => id !== fillerId)
  const open = panes.filter((id) => layout[id] > headerSize + epsilon)
  const free = 100 - (panes.length - open.length) * headerSize
  const next: Layout = { ...layout }
  for (const id of panes) if (!open.includes(id)) next[id] = headerSize
  if (open.length) {
    const total = open.reduce((sum, id) => sum + layout[id], 0)
    for (const id of open) next[id] = (layout[id] / total) * free
    next[fillerId] = 0
  } else {
    next[fillerId] = free
  }
  const changed = Object.keys(next).some((id) => Math.abs(next[id] - layout[id]) > 0.01)
  return changed ? next : null
}
