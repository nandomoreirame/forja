import { UsagePanel } from '@/renderer/src/features/usage/usage-panel'
import type { ComponentType } from 'react'
import {
  Archive,
  BookOpen,
  Brain,
  ClipboardList,
  GitPullRequest,
  KanbanSquare,
  ListChecks,
  ListTodo,
  ListTree,
  PanelLeft,
  Plug,
  Settings,
} from 'lucide-react'
import { getDictionary } from '@/shared/i18n'
import {
  Button,
  Kbd,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useSidebar,
} from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import { isEnabled } from '@/renderer/src/shared/lib/feature-flags'

type Item = { label: string; icon: ComponentType<{ className?: string }>; run: () => void }

/** Topbar button that shows or hides the sidebar, like Cursor's; Ctrl+B does the same. */
export function SidebarToggle() {
  const state = useWorkbench((s) => s)
  const { open, toggleSidebar } = useSidebar()
  const a = getDictionary(state.source.locale).app
  const label = open ? a.collapseLeft : a.expandLeft
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={open}
          onClick={toggleSidebar}
          className="size-6"
        >
          <PanelLeft className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        {label}
        <span className="flex gap-0.5">
          <Kbd>Ctrl</Kbd>
          <Kbd>B</Kbd>
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

/** The collapsed sidebar: one icon per section, with its name in a tooltip. */
export function SidebarRail() {
  const state = useWorkbench((s) => s)
  const { setOpen } = useSidebar()
  const a = getDictionary(state.source.locale).app
  // Opening from a section icon expands that section, as VS Code does from its activity bar.
  const section = (id: string) => () => {
    layoutStorage.setItem(`forja.sidebar.${id}`, 'true')
    setOpen(true)
  }
  const sections: Item[] = [
    { label: a.chats, icon: ListTree, run: section('features') },
    { label: a.specs, icon: ClipboardList, run: section('specs') },
    { label: a.plans, icon: ListChecks, run: section('plans') },
    { label: a.reviews, icon: GitPullRequest, run: section('reviews') },
    { label: a.skills, icon: BookOpen, run: section('skills') },
    { label: a.memories, icon: Brain, run: section('memories') },
  ]
  const workspace: Item[] = [
    ...(isEnabled('backlog-board')
      ? [
          { label: a.backlog.title, icon: ListTodo, run: () => state.openBacklog() },
          { label: a.board.title, icon: KanbanSquare, run: () => state.openBoard() },
        ]
      : []),
    { label: a.archived, icon: Archive, run: () => state.openArchived() },
    { label: 'Connectors', icon: Plug, run: () => state.openSettings({ tab: 'connectors' }) },
    { label: a.settings, icon: Settings, run: () => state.openSettings({ tab: 'general' }) },
  ]
  const menu = (items: Item[]) => (
    <SidebarMenu className="items-center">
      {items.map(({ label, icon: Icon, run }) => (
        <SidebarMenuItem key={label}>
          <SidebarMenuButton
            aria-label={label}
            tooltip={label}
            onClick={run}
            className="size-8 justify-center"
          >
            <Icon className="size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
  return (
    <nav aria-label={a.sidebarSections} className="h-full">
      <Sidebar
        collapsible="none"
        data-slot="workbench-part"
        data-part="sidebar-rail"
        className="h-full w-(--sidebar-width-icon) rounded-part border border-border bg-transparent py-1"
      >
        <SidebarContent>{menu(sections)}</SidebarContent>
        <SidebarFooter className="p-0">
          <UsagePanel source={state.source} collapsed onExpand={() => setOpen(true)} />
          {menu(workspace)}
        </SidebarFooter>
      </Sidebar>
    </nav>
  )
}
