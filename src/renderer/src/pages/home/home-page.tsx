import { Folder, Clock3, Terminal } from 'lucide-react'
import { getDictionary } from '@/shared/i18n'
import { ForjaMark, Kbd } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
export function HomePage() {
  const state = useWorkbench((s) => s)
  const a = getDictionary(state.source.locale).app
  const actions = [
    {
      label: state.snapshot ? a.newConversation : a.openProject,
      keys: state.snapshot ? ['Ctrl', 'N'] : ['Ctrl', 'O'],
      run: () => (state.snapshot ? state.startCompose() : void state.openDirectory()),
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
      <div className="w-full max-w-[420px] space-y-1">
        {actions.map((action, index) => (
          <button
            type="button"
            key={action.label}
            disabled={index === 0 && !state.snapshot && state.pickingDirectory}
            onClick={action.run}
            className="flex min-h-10 w-full items-center justify-between gap-4 rounded-sm border border-transparent px-3 py-2.5 text-left text-xs text-foreground hover:border-border hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="flex min-w-0 items-center gap-3">
              {!state.snapshot ? (
                index === 0 ? (
                  <Folder className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : index === 1 ? (
                  <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Terminal className="size-4 text-muted-foreground" aria-hidden="true" />
                )
              ) : null}
              <span>{action.label}</span>
            </span>
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
