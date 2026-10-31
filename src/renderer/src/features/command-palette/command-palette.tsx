import { Folder, Check } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandShortcut,
} from '@/shared/ui'
import type { CommandDialogProps } from '@/shared/ui/command'
import type { ProjectSummary } from '@/renderer/src/shared/api'
import { relativeTime } from './relative-time'
export type CommandId = 'new-conversation' | 'recent-projects' | 'settings' | 'toggle-terminals'
interface Props {
  open: boolean
  scope: 'all' | 'recent'
  locale: Locale
  now?: Date
  projects: ProjectSummary[]
  currentProjectId: string
  onOpenChange: (open: boolean) => void
  onSelectProject: (id: string) => void
  onCommand: (id: CommandId) => void
  onCloseAutoFocus?: CommandDialogProps['onCloseAutoFocus']
}
export function CommandPalette({
  open,
  scope,
  locale,
  now = new Date(),
  projects,
  currentProjectId,
  onOpenChange,
  onSelectProject,
  onCommand,
  onCloseAutoFocus,
}: Props) {
  const a = getDictionary(locale).app
  const commands: { id: CommandId; label: string; shortcut?: string }[] = [
    { id: 'new-conversation', label: a.newConversation, shortcut: 'Ctrl+N' },
    { id: 'recent-projects', label: a.recent, shortcut: 'Ctrl+R' },
    { id: 'settings', label: a.settings },
    { id: 'toggle-terminals', label: a.terminals },
  ]
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={a.commandBar}
      description={a.searchCommands}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <CommandInput aria-label={a.searchCommands} placeholder={a.searchCommands} />
      <CommandList>
        <CommandEmpty>{a.emptyCommands}</CommandEmpty>
        <CommandGroup heading={a.recent}>
          {projects.map((project) => (
            <CommandItem
              key={project.id}
              value={project.name + ' ' + project.path}
              aria-current={project.id === currentProjectId ? 'true' : undefined}
              onSelect={() => {
                if (project.id !== currentProjectId) onSelectProject(project.id)
                onOpenChange(false)
              }}
              className="gap-2.5 py-2"
            >
              <Folder className="size-3.5 text-primary" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col text-xs">
                <span>{project.name}</span>
                <span className="truncate text-[10px] text-muted-foreground">{project.path}</span>
              </span>
              <CommandShortcut>
                {project.id === currentProjectId ? (
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
                ) : (
                  relativeTime(project.lastOpenedAt, locale, now)
                )}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        {scope === 'all' ? (
          <CommandGroup heading={a.commands}>
            {commands.map((command) => (
              <CommandItem
                key={command.id}
                value={command.label}
                onSelect={() => {
                  onCommand(command.id)
                  if (command.id !== 'recent-projects') onOpenChange(false)
                }}
              >
                <span>{command.label}</span>
                {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
            <CommandItem disabled value={a.openFolder}>
              <span>
                {a.openFolder}
                <span className="block text-[10px] text-muted-foreground">{a.pickerHint}</span>
              </span>
            </CommandItem>
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
