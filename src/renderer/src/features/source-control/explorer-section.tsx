import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { cn } from '@/shared/ui/utils'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { NavigatorSection, rowFocus } from '@/renderer/src/features/project-navigator/section'
import type { FileNode, GitStatus } from '@/renderer/src/shared/api'
import { FileIcon } from './file-icon'
import { changeIndex, sortNodes, statusTone } from './model'

/** The project file tree, like VS Code's Explorer, with git colors, letters and folder dots. */
export function ExplorerSection({ locale }: { locale: Locale }) {
  const snapshot = useWorkbench((s) => s.snapshot!)
  const a = getDictionary(locale).app
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const index = changeIndex(snapshot.changes)
  const toggle = (path: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })
  const label = (name: string, status?: GitStatus) =>
    status ? `${name}, ${a.gitStatuses[status]}` : name
  const renderNodes = (nodes: FileNode[], parent: string, level: number) =>
    sortNodes(nodes).map((node) => {
      const path = parent ? `${parent}/${node.name}` : node.name
      const indent = { paddingLeft: 8 + (level - 1) * 12 }
      const dimmed = node.ignored && 'text-muted-foreground/60'
      if (node.children) {
        const expanded = open.has(path)
        const status = index.folders.get(path)
        return (
          <li
            key={path}
            role="treeitem"
            aria-level={level}
            aria-expanded={expanded}
            aria-label={label(node.name, status)}
          >
            <button
              type="button"
              style={indent}
              onClick={() => toggle(path)}
              className={cn(
                'flex h-[22px] w-full items-center gap-1 pr-3 text-left text-[13px] hover:bg-accent',
                rowFocus,
                dimmed ?? 'text-foreground',
                status && statusTone[status],
              )}
            >
              {expanded ? (
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              {expanded ? (
                <FolderOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Folder aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{node.name}</span>
              {status ? (
                <span
                  aria-hidden="true"
                  data-slot="change-dot"
                  className={cn('ml-auto size-1.5 shrink-0 rounded-full bg-current')}
                />
              ) : null}
            </button>
            {expanded ? <ul role="group">{renderNodes(node.children, path, level + 1)}</ul> : null}
          </li>
        )
      }
      const status = index.files.get(path)
      return (
        <li
          key={path}
          role="treeitem"
          aria-level={level}
          aria-label={label(node.name, status)}
          style={{ paddingLeft: 8 + (level - 1) * 12 + 20 }}
          className={cn(
            'flex h-[22px] items-center gap-1 pr-3 text-[13px] hover:bg-accent',
            dimmed ?? 'text-foreground',
            status && statusTone[status],
          )}
        >
          <FileIcon name={node.name} className="text-muted-foreground" />
          <span className="truncate">{node.name}</span>
          {status ? (
            <span
              aria-hidden="true"
              className="ml-auto w-4 shrink-0 text-center text-[12px] font-medium"
            >
              {status}
            </span>
          ) : null}
        </li>
      )
    })
  return (
    <NavigatorSection section="explorer" title={a.explorer} defaultSize="40%">
      {snapshot.files?.length ? (
        <ul role="tree" aria-label={a.explorer}>
          {renderNodes(snapshot.files, '', 1)}
        </ul>
      ) : (
        <p className="flex h-[22px] items-center pl-5 text-[13px] text-muted-foreground">
          {a.explorerEmpty}
        </p>
      )}
    </NavigatorSection>
  )
}
