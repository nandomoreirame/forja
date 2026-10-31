import { getDictionary } from '@/shared/i18n'
import { ForjaMark, Kbd } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
export function HomePage() {
  const state = useWorkbench((s) => s)
  const a = getDictionary(state.source.locale).app
  const actions = [
    {
      label: a.newConversation,
      keys: ['Ctrl', 'N'],
      run: () => state.navigate({ kind: 'compose', role: 'research' }),
    },
    { label: a.recent, keys: ['Ctrl', 'R'], run: () => state.openPalette('recent') },
    { label: a.allCommands, keys: ['Ctrl', 'Shift', 'P'], run: () => state.openPalette('all') },
  ]
  return (
    <section
      className="flex min-h-0 flex-1 flex-col items-center justify-center p-6"
      aria-label="Forja"
    >
      <div className="mb-8 flex items-center gap-2.5">
        <ForjaMark className="size-6 text-primary" />
        <h1 className="text-lg font-bold tracking-widest">FORJA</h1>
        <span className="text-xs text-muted-foreground">v2.0</span>
      </div>
      <div className="w-full max-w-[440px] space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.run}
            className="flex min-h-9 w-full items-center justify-between gap-4 rounded-sm px-2 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span>{action.label}</span>
            <span className="flex items-center gap-1">
              {action.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
