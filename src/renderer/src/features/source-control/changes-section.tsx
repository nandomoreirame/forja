import { getDictionary, type Locale } from '@/shared/i18n'
import { cn } from '@/shared/ui/utils'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { NavigatorSection } from '@/renderer/src/features/project-navigator/section'
import { FileIcon } from './file-icon'
import { splitPath, statusTone } from './model'

/** Working tree changes, like VS Code's Source Control: file, folder and git status letter. */
export function ChangesSection({ locale }: { locale: Locale }) {
  const changes = useWorkbench((s) => s.snapshot!.changes)
  const a = getDictionary(locale).app
  return (
    <NavigatorSection
      section="changes"
      title={a.changes}
      count={changes.length}
      defaultSize="30%"
      empty={a.noChanges}
    >
      {changes.length ? (
        <ul aria-label={a.changes}>
          {changes.map(({ path, status }) => {
            const { name, dir } = splitPath(path)
            return (
              <li
                key={path}
                aria-label={[name, dir, a.gitStatuses[status]].filter(Boolean).join(', ')}
                className="flex h-[22px] items-center gap-1.5 pl-5 pr-3 text-[13px] hover:bg-accent"
              >
                <FileIcon name={name} className="text-muted-foreground" />
                <span
                  // The file name keeps priority; only the folder path truncates.
                  className={cn(
                    'max-w-[75%] shrink-0 truncate',
                    status === 'D' && 'line-through',
                    statusTone[status],
                  )}
                >
                  {name}
                </span>
                {dir ? (
                  <span className="min-w-0 truncate text-[12px] text-muted-foreground">{dir}</span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    'ml-auto w-4 shrink-0 text-center text-[12px] font-medium',
                    statusTone[status],
                  )}
                >
                  {status}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </NavigatorSection>
  )
}
