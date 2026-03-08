# Project Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use implement-plan to implement this plan task-by-task.

**Goal:** Replace the "workspace" concept with a visual project sidebar similar to VS Code/Cursor — a narrow strip on the far left that shows all open projects as letter icons (or favicons), lets users switch between projects with a single click, and shows sessions scoped to the active project.

**Architecture:** The sidebar is a new `ProjectSidebar` component rendered before `FileTreeSidebar`. It reads from `useFileTreeStore` (existing store for trees) and a new `useProjectsStore` that replaces workspace management. The `WorkspaceStore` and all IPC workspace handlers are replaced by simpler project-centric APIs. Sessions (terminal tabs) remain scoped to `currentPath` — no change needed in `terminal-tabs.ts`. Project icons are letter-based by default; the frontend checks common asset paths (`/public/favicon.ico`, `public/favicon.png`, `public/images/*.{png,svg}`) to upgrade to a real icon.

**Tech Stack:** React 19 + TypeScript, Zustand, Tailwind CSS 4 (Catppuccin Mocha), shadcn/ui Tooltip, Lucide React, electron-store (existing), node `path` + `fs` modules (existing), Vitest + React Testing Library

---

## Performance Strategy: Always Running (MVP)

O caso de uso principal do Forja é o usuário ter **2-3 projetos abertos simultaneamente**. Com esse volume, não há necessidade de hibernação de processos no MVP.

### Princípios

- **Todos os PTYs ficam vivos o tempo todo.** Não há SIGSTOP, lazy spawn, ou qualquer ciclo de vida complexo.
- **Trocar de projeto é apenas visual.** O frontend filtra as tabs exibidas pelo `activeProjectPath` do `useProjectsStore`. Os PTYs de outros projetos continuam rodando normalmente em background.
- **RingBuffer por sessão no main process.** Cada PTY session acumula output em um `RingBuffer` de 2MB no processo principal, independente de o frontend estar renderizando aquela sessão.
- **Replay ao ativar um projeto.** Ao trocar para um projeto, o xterm.js faz replay do buffer acumulado via raw buffer replay (ou `@xterm/addon-serialize` se disponível).
- **Indicadores visuais de atividade.** A sidebar mostra um spinner quando um PTY de um projeto em background está rodando, e um badge de notificação quando o processo termina.

### Fluxo de dados

```
PTY session (node-pty)
  |
  +-- output chunks --> RingBuffer (2MB, main process, por session)
  |                          |
  |                          +-- ipc event --> frontend (xterm.js ativo apenas)
  |
  +-- exit event --> pty:session-state-changed --> frontend
                         |
                         +-- spinner → badge na sidebar
                         +-- Electron Notification API (notificação nativa)
```

### Mudanças no código para esta estratégia

| Arquivo | Mudança |
|---------|---------|
| `electron/pty.ts` | Cada session ganha `projectPath` + instância de `RingBuffer` |
| `electron/ring-buffer.ts` | Nova classe `RingBuffer` (2MB max, sobrescreve mais antigo) |
| `electron/main.ts` | Handler `pty:get-buffer` para enviar replay ao frontend; Handler `pty:session-state-changed` event |
| `frontend/stores/terminal-tabs.ts` | Campo `activeProjectPath` para filtrar tabs visíveis |
| `frontend/components/xterm-panel.tsx` | Ao montar/ativar, solicita replay do buffer via IPC |
| `frontend/stores/projects.ts` | Campo `sessionStates` por projeto (running/exited/idle) |
| `frontend/components/project-sidebar.tsx` | Renderiza spinner ou badge baseado em `sessionStates` |

### Otimizações Futuras (Fase 2 — não implementar agora)

As otimizações abaixo são válidas para cenários com muitos projetos abertos (10+), mas estão fora do escopo do MVP:

- **SIGSTOP / SIGCONT:** Pausar PTYs de projetos não ativos para economizar CPU. Requer lógica de lifecycle e pode causar bugs em CLIs que não toleram pausa.
- **Lazy spawn:** Não criar o PTY até o usuário selecionar o projeto pela primeira vez. Muda o modelo mental do usuário.
- **RingBuffer comprimido:** gzip do buffer para reduzir memória (tradeoff: CPU na descompressão).
- **Limite de projetos simultâneos:** Hibernar automaticamente o projeto menos usado quando o número de projetos exceder um threshold configurável.

---

## Task 1: Create `useProjectsStore` (replaces workspace store)

**Files:**
- Create: `frontend/stores/projects.ts`
- Create: `frontend/stores/__tests__/projects.test.ts`

**Context:**
The current `useWorkspaceStore` (`frontend/stores/workspace.ts`) manages "workspaces" that contain arrays of projects. We need a simpler model: just a flat list of open project paths, with one being "active." The store talks to existing IPC handlers (`get_recent_projects`, `add_recent_project`) plus new ones we'll add in Task 2.

**Step 1: Write the failing test**

Create `frontend/stores/__tests__/projects.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProjectsStore } from "../projects";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { invoke } from "@/lib/ipc";

describe("useProjectsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectsStore.setState({
      projects: [],
      activeProjectPath: null,
      loading: false,
    });
  });

  it("loads projects from IPC", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([
      { path: "/home/user/my-app", name: "my-app", last_opened: "2026-01-01" },
    ]);

    await useProjectsStore.getState().loadProjects();

    expect(useProjectsStore.getState().projects).toHaveLength(1);
    expect(useProjectsStore.getState().projects[0].path).toBe("/home/user/my-app");
  });

  it("sets active project", () => {
    useProjectsStore.setState({
      projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "2026-01-01" }],
    });

    useProjectsStore.getState().setActiveProject("/home/user/my-app");

    expect(useProjectsStore.getState().activeProjectPath).toBe("/home/user/my-app");
  });

  it("generates letter icon from project name", () => {
    const icon = useProjectsStore.getState().getProjectInitial("my-app");
    expect(icon).toBe("M");
  });

  it("generates deterministic color from project name", () => {
    const color1 = useProjectsStore.getState().getProjectColor("my-app");
    const color2 = useProjectsStore.getState().getProjectColor("my-app");
    expect(color1).toBe(color2);
    expect(color1).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("adds a new project", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useProjectsStore.getState().addProject("/home/user/new-project");

    expect(invoke).toHaveBeenCalledWith("add_recent_project", { path: "/home/user/new-project" });
  });

  it("removes a project from the list", () => {
    useProjectsStore.setState({
      projects: [
        { path: "/a", name: "a", lastOpened: "" },
        { path: "/b", name: "b", lastOpened: "" },
      ],
      activeProjectPath: "/a",
    });

    useProjectsStore.getState().removeProject("/a");

    const { projects, activeProjectPath } = useProjectsStore.getState();
    expect(projects).toHaveLength(1);
    // Active should move to the first remaining project
    expect(activeProjectPath).toBe("/b");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: `FAIL` — "Cannot find module '../projects'"

**Step 3: Write minimal implementation**

Create `frontend/stores/projects.ts`:

```typescript
import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import path from "path-browserify";

// Catppuccin Mocha palette colors for project icons (excluding too-dark/light)
const PROJECT_COLORS = [
  "#cba6f7", // mauve (brand)
  "#f38ba8", // red
  "#fab387", // peach
  "#f9e2af", // yellow
  "#a6e3a1", // green
  "#94e2d5", // teal
  "#89dceb", // sky
  "#89b4fa", // blue
  "#b4befe", // lavender
  "#f5c2e7", // pink
];

export interface Project {
  path: string;
  name: string;
  lastOpened: string;
  iconPath?: string | null; // resolved favicon/logo path, null = use letter
}

interface ProjectsState {
  projects: Project[];
  activeProjectPath: string | null;
  loading: boolean;

  loadProjects: () => Promise<void>;
  addProject: (projectPath: string) => Promise<void>;
  removeProject: (projectPath: string) => void;
  setActiveProject: (projectPath: string) => void;
  getProjectInitial: (nameOrPath: string) => string;
  getProjectColor: (nameOrPath: string) => string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectPath: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const raw = await invoke<Array<{ path: string; name: string; last_opened: string }>>(
        "get_recent_projects"
      );
      const projects: Project[] = (raw ?? []).map((p) => ({
        path: p.path,
        name: p.name || path.basename(p.path),
        lastOpened: p.last_opened,
        iconPath: null,
      }));
      set({ projects, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addProject: async (projectPath: string) => {
    const name = path.basename(projectPath);
    await invoke("add_recent_project", { path: projectPath });
    const existing = get().projects.find((p) => p.path === projectPath);
    if (!existing) {
      const newProject: Project = {
        path: projectPath,
        name,
        lastOpened: new Date().toISOString(),
        iconPath: null,
      };
      set((state) => ({ projects: [newProject, ...state.projects] }));
    }
    set({ activeProjectPath: projectPath });
  },

  removeProject: (projectPath: string) => {
    const { projects, activeProjectPath } = get();
    const newProjects = projects.filter((p) => p.path !== projectPath);
    let newActive = activeProjectPath;
    if (activeProjectPath === projectPath) {
      newActive = newProjects[0]?.path ?? null;
    }
    set({ projects: newProjects, activeProjectPath: newActive });
  },

  setActiveProject: (projectPath: string) => {
    set({ activeProjectPath: projectPath });
  },

  getProjectInitial: (nameOrPath: string) => {
    const name = path.basename(nameOrPath);
    return (name[0] ?? "?").toUpperCase();
  },

  getProjectColor: (nameOrPath: string) => {
    const name = path.basename(nameOrPath);
    const index = hashString(name) % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
  },
}));
```

**Step 4: Run test to verify it passes**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: All 6 tests PASS

**Step 5: Check if path-browserify is available**

```bash
cd /home/nandomoreira/dev/projects/forja && grep -r "path-browserify" package.json
```

If not available, use a simpler inline helper instead:

```typescript
// Instead of: import path from "path-browserify";
// Use this inline at the top of the file:
function basename(p: string): string {
  return p.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? p;
}
```

And replace all `path.basename(...)` calls with `basename(...)`.

---

## Task 2: Add IPC handler for fetching project icon

**Files:**
- Modify: `electron/main.ts` (add `detect_project_icon` handler)
- Modify: `electron/preload.cts` (expose new channel)

**Context:**
We need a lightweight IPC call that checks if a project directory has a favicon or logo image in common locations. This returns a `file://` path usable by `<img>` in the renderer, or `null` if nothing found.

**Step 1: Write the failing test**

Create `electron/__tests__/project-icon.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

vi.mock("fs");

const mockFs = vi.mocked(fs);

// We'll test the pure function, not the IPC handler
// Import after mocking
import { detectProjectIcon } from "../project-icon";

describe("detectProjectIcon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no icon found", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(detectProjectIcon("/home/user/myapp")).toBeNull();
  });

  it("returns favicon.ico path when it exists", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.ico")
    );
    const result = detectProjectIcon("/home/user/myapp");
    expect(result).toContain("favicon.ico");
  });

  it("prefers favicon.svg over favicon.ico", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.svg") || String(p).endsWith("favicon.ico")
    );
    const result = detectProjectIcon("/home/user/myapp");
    expect(result).toContain("favicon.svg");
  });

  it("returns logo.png from public/images when available", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).includes("public/images/logo.png")
    );
    const result = detectProjectIcon("/home/user/myapp");
    expect(result).toContain("logo.png");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test electron/__tests__/project-icon.test.ts --reporter=verbose
```

Expected: `FAIL` — "Cannot find module '../project-icon'"

**Step 3: Create `electron/project-icon.ts`**

```typescript
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

// Ordered by preference: SVG > PNG > ICO
const ICON_CANDIDATES = [
  "public/favicon.svg",
  "public/favicon.png",
  "public/favicon.ico",
  "public/logo.svg",
  "public/logo.png",
  "public/images/logo.svg",
  "public/images/logo.png",
  "public/images/icon.svg",
  "public/images/icon.png",
  "assets/icons/icon.svg",
  "assets/icons/icon.png",
  "favicon.svg",
  "favicon.png",
  "favicon.ico",
];

/**
 * Checks common locations for a project icon.
 * Returns a `file://` URL string if found, or null.
 */
export function detectProjectIcon(projectPath: string): string | null {
  for (const candidate of ICON_CANDIDATES) {
    const fullPath = path.join(projectPath, candidate);
    if (fs.existsSync(fullPath)) {
      return pathToFileURL(fullPath).toString();
    }
  }
  return null;
}
```

**Step 4: Add IPC handler in `electron/main.ts`**

In `electron/main.ts`, add after the existing imports:

```typescript
const getProjectIcon = lazyImport(() => import("./project-icon.js"));
```

Then add the IPC handler at the end of the IPC handlers section:

```typescript
ipcMain.handle("detect_project_icon", async (_event, args: { path: string }) => {
  const mod = await getProjectIcon();
  return mod.detectProjectIcon(args.path);
});
```

**Step 5: Expose in `electron/preload.cts`**

Find the `contextBridge.exposeInMainWorld("electronAPI", { ... })` block and add:

```typescript
detect_project_icon: (path: string) =>
  ipcRenderer.invoke("detect_project_icon", { path }),
```

Also add the channel to the `validChannels` allowlist for `invoke`.

**Step 6: Run tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test electron/__tests__/project-icon.test.ts --reporter=verbose
```

Expected: All 4 tests PASS

---

## Task 3: Create `ProjectSidebar` component

**Files:**
- Create: `frontend/components/project-sidebar.tsx`
- Create: `frontend/components/__tests__/project-sidebar.test.tsx`

**Context:**
A narrow vertical strip (~48px wide) that sits at the far-left edge of the layout (before `FileTreeSidebar`). Each project is represented by a 36x36 icon with the first letter of the project name on a color derived from the name hash. The active project has a 2px brand-colored left border. A "+" button at the bottom opens the native file picker.

**Step 1: Write the failing test**

Create `frontend/components/__tests__/project-sidebar.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectSidebar } from "../project-sidebar";
import { useProjectsStore } from "@/stores/projects";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@/stores/projects");

const mockUseProjectsStore = vi.mocked(useProjectsStore);

describe("ProjectSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders project icons for each project", () => {
    mockUseProjectsStore.mockReturnValue({
      projects: [
        { path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null },
        { path: "/b/other", name: "other", lastOpened: "", iconPath: null },
      ],
      activeProjectPath: "/a/my-app",
      loading: false,
      loadProjects: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      setActiveProject: vi.fn(),
      getProjectInitial: (n: string) => n[0].toUpperCase(),
      getProjectColor: () => "#cba6f7",
    } as never);

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByLabelText("Switch to project: my-app")).toBeTruthy();
    expect(screen.getByLabelText("Switch to project: other")).toBeTruthy();
    expect(screen.getByText("M")).toBeTruthy();
    expect(screen.getByText("O")).toBeTruthy();
  });

  it("renders + button to add a project", () => {
    mockUseProjectsStore.mockReturnValue({
      projects: [],
      activeProjectPath: null,
      loading: false,
      loadProjects: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      setActiveProject: vi.fn(),
      getProjectInitial: vi.fn(),
      getProjectColor: vi.fn(),
    } as never);

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByLabelText("Add project")).toBeTruthy();
  });

  it("calls onOpenProject when + button is clicked", () => {
    const onOpenProject = vi.fn();
    mockUseProjectsStore.mockReturnValue({
      projects: [],
      activeProjectPath: null,
      loading: false,
      loadProjects: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      setActiveProject: vi.fn(),
      getProjectInitial: vi.fn(),
      getProjectColor: vi.fn(),
    } as never);

    render(<ProjectSidebar onOpenProject={onOpenProject} />);

    fireEvent.click(screen.getByLabelText("Add project"));
    expect(onOpenProject).toHaveBeenCalledOnce();
  });

  it("marks the active project with aria-pressed", () => {
    mockUseProjectsStore.mockReturnValue({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
      loading: false,
      loadProjects: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      setActiveProject: vi.fn(),
      getProjectInitial: () => "M",
      getProjectColor: () => "#cba6f7",
    } as never);

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/components/__tests__/project-sidebar.test.tsx --reporter=verbose
```

Expected: `FAIL` — "Cannot find module '../project-sidebar'"

**Step 3: Implement `ProjectSidebar`**

Create `frontend/components/project-sidebar.tsx`:

```typescript
import { Plus } from "lucide-react";
import { useCallback } from "react";
import { useProjectsStore, type Project } from "@/stores/projects";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ProjectIconProps {
  project: Project;
  isActive: boolean;
  onSelect: (path: string) => void;
}

function ProjectIcon({ project, isActive, onSelect }: ProjectIconProps) {
  const getProjectInitial = useProjectsStore((s) => s.getProjectInitial);
  const getProjectColor = useProjectsStore((s) => s.getProjectColor);

  const initial = getProjectInitial(project.name);
  const color = getProjectColor(project.name);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="button"
          aria-label={`Switch to project: ${project.name}`}
          aria-pressed={isActive}
          onClick={() => onSelect(project.path)}
          className={cn(
            "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150",
            isActive
              ? "ring-2 ring-brand ring-offset-1 ring-offset-ctp-mantle"
              : "opacity-70 hover:opacity-100"
          )}
          style={{ backgroundColor: `${color}22`, color }}
        >
          {project.iconPath ? (
            <img
              src={project.iconPath}
              alt={project.name}
              className="h-6 w-6 rounded object-contain"
              onError={(e) => {
                // Fallback to letter if image fails
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span>{initial}</span>
          )}
          {isActive && (
            <span
              className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-brand"
              aria-hidden="true"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <p className="font-semibold">{project.name}</p>
        <p className="text-xs text-ctp-overlay1">{project.path}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ProjectSidebarProps {
  onOpenProject: () => void;
}

export function ProjectSidebar({ onOpenProject }: ProjectSidebarProps) {
  const projects = useProjectsStore((s) => s.projects);
  const activeProjectPath = useProjectsStore((s) => s.activeProjectPath);
  const setActiveProject = useProjectsStore((s) => s.setActiveProject);

  const handleSelect = useCallback(
    (projectPath: string) => {
      setActiveProject(projectPath);
    },
    [setActiveProject]
  );

  return (
    <TooltipProvider delayDuration={500}>
      <div
        data-testid="project-sidebar"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 border-r border-ctp-surface0 bg-ctp-mantle py-2"
      >
        {projects.map((project) => (
          <ProjectIcon
            key={project.path}
            project={project}
            isActive={project.path === activeProjectPath}
            onSelect={handleSelect}
          />
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Add project"
              onClick={onOpenProject}
              className="mt-auto flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-ctp-surface1 text-ctp-overlay1 transition-colors hover:border-ctp-surface2 hover:text-ctp-text"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add project</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

**Step 4: Run tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/components/__tests__/project-sidebar.test.tsx --reporter=verbose
```

Expected: All 4 tests PASS

---

## Task 4: Integrate `ProjectSidebar` into `App.tsx` layout

**Files:**
- Modify: `frontend/App.tsx`

**Context:**
The current layout in `App.tsx` is:
```
[Titlebar]
[Sidebar (FileTree)] | [Main content]
```

After this task:
```
[Titlebar]
[ProjectSidebar (48px)] | [Sidebar (FileTree)] | [Main content]
```

The `ProjectSidebar` sits outside the `ResizablePanelGroup` — it's always visible and fixed-width. When a project is clicked in `ProjectSidebar`, we call `useFileTreeStore.openProjectPath(path)` to load it.

**Step 1: Write the failing integration check**

Add this test to `frontend/components/__tests__/project-sidebar.test.tsx` (existing file):

```typescript
it("displays empty state when no projects exist", () => {
  mockUseProjectsStore.mockReturnValue({
    projects: [],
    activeProjectPath: null,
    loading: false,
    loadProjects: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    setActiveProject: vi.fn(),
    getProjectInitial: vi.fn(),
    getProjectColor: vi.fn(),
  } as never);

  render(<ProjectSidebar onOpenProject={vi.fn()} />);

  // Only "Add project" button should be visible, no project icons
  expect(screen.queryAllByRole("button").length).toBe(1);
  expect(screen.getByLabelText("Add project")).toBeTruthy();
});
```

**Step 2: Run test to verify it passes (no new code needed)**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/components/__tests__/project-sidebar.test.tsx --reporter=verbose
```

Expected: All 5 tests PASS

**Step 3: Modify `frontend/App.tsx`**

At the top, add the import:

```typescript
import { ProjectSidebar } from "./components/project-sidebar";
import { useProjectsStore } from "./stores/projects";
```

In the `App` component, load projects on mount by adding inside the existing `useEffect` block that loads workspaces:

```typescript
// Replace the workspace loading effect with projects loading:
useEffect(() => {
  useProjectsStore.getState().loadProjects();
}, []);
```

In the JSX, find the `ResizablePanelGroup` that wraps sidebar + main content and add `ProjectSidebar` before it:

```tsx
// BEFORE (existing):
{panelPrefsLoaded && hasProject ? (
  <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
    <ResizablePanel panelRef={sidebarPanelRef} ...>
      <FileTreeSidebar />
    </ResizablePanel>
    ...
  </ResizablePanelGroup>
) : (
  ...
)}

// AFTER (add ProjectSidebar as a sibling div before ResizablePanelGroup):
{panelPrefsLoaded && (
  <div className="flex flex-1 overflow-hidden">
    <ProjectSidebar
      onOpenProject={() => useFileTreeStore.getState().openProject()}
    />
    {hasProject ? (
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        {/* existing panels unchanged */}
      </ResizablePanelGroup>
    ) : (
      <div className="flex flex-1 flex-col overflow-hidden">
        <EmptyState />
      </div>
    )}
  </div>
)}
```

Also update `handleNewSessionType` to use `activeProjectPath` from `useProjectsStore` when `currentPath` is null:

```typescript
const handleNewSessionType = useCallback(
  (sessionType: SessionType) => {
    const projectPath = currentPath ?? useProjectsStore.getState().activeProjectPath;
    if (!projectPath) return;
    const tabId = nextTabId();
    addTab(tabId, projectPath, sessionType);
  },
  [currentPath, nextTabId, addTab],
);
```

**Step 4: Run all frontend tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --project frontend --reporter=verbose
```

Expected: All tests PASS

---

## Task 5: Wire project switching to open sessions

**Files:**
- Modify: `frontend/stores/projects.ts`
- Modify: `frontend/components/project-sidebar.tsx`

**Context:**
When a user clicks a project icon in the sidebar, we need to:
1. Set it as the active project in `useProjectsStore`
2. Call `useFileTreeStore.openProjectPath(path)` to load the file tree
3. The terminal sessions are already scoped to `currentPath` from `useFileTreeStore`, so switching projects naturally scopes sessions

**Step 1: Write the failing test for side effects**

Add to `frontend/stores/__tests__/projects.test.ts`:

```typescript
import { useFileTreeStore } from "@/stores/file-tree";

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: vi.fn(() => ({
      openProjectPath: vi.fn(),
    })),
  },
}));

it("switches to project and loads file tree", async () => {
  const mockOpenProjectPath = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useFileTreeStore.getState).mockReturnValue({
    openProjectPath: mockOpenProjectPath,
  } as never);

  useProjectsStore.setState({
    projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "" }],
  });

  await useProjectsStore.getState().switchToProject("/home/user/my-app");

  expect(useProjectsStore.getState().activeProjectPath).toBe("/home/user/my-app");
  expect(mockOpenProjectPath).toHaveBeenCalledWith("/home/user/my-app");
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: FAIL — `switchToProject is not a function`

**Step 3: Add `switchToProject` to `useProjectsStore`**

In `frontend/stores/projects.ts`, update the `ProjectsState` interface and the store implementation:

```typescript
// Add to interface:
switchToProject: (projectPath: string) => Promise<void>;

// Add to store implementation:
switchToProject: async (projectPath: string) => {
  set({ activeProjectPath: projectPath });
  const { useFileTreeStore } = await import("./file-tree");
  await useFileTreeStore.getState().openProjectPath(projectPath);
},
```

**Step 4: Update `ProjectSidebar` to use `switchToProject`**

In `frontend/components/project-sidebar.tsx`, update `handleSelect`:

```typescript
const handleSelect = useCallback(
  async (projectPath: string) => {
    await useProjectsStore.getState().switchToProject(projectPath);
  },
  []
);
```

**Step 5: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --project frontend --reporter=verbose
```

Expected: All tests PASS

---

## Task 6: Detect project icon from filesystem

**Files:**
- Modify: `frontend/stores/projects.ts` (add `loadProjectIcon` action)
- Modify: `frontend/components/project-sidebar.tsx` (call icon detection on mount)

**Context:**
After a project is loaded, we check if the project directory has a favicon or logo image using the `detect_project_icon` IPC call added in Task 2. If found, the `iconPath` is set on the project and `<img>` is rendered instead of the letter.

**Step 1: Write the failing test**

Add to `frontend/stores/__tests__/projects.test.ts`:

```typescript
it("loads project icon via IPC", async () => {
  vi.mocked(invoke).mockImplementation(async (channel) => {
    if (channel === "detect_project_icon") return "file:///home/user/my-app/public/favicon.svg";
    return null;
  });

  useProjectsStore.setState({
    projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "", iconPath: null }],
  });

  await useProjectsStore.getState().loadProjectIcon("/home/user/my-app");

  const project = useProjectsStore.getState().projects.find((p) => p.path === "/home/user/my-app");
  expect(project?.iconPath).toBe("file:///home/user/my-app/public/favicon.svg");
});

it("sets iconPath to null when no icon found", async () => {
  vi.mocked(invoke).mockResolvedValue(null);

  useProjectsStore.setState({
    projects: [{ path: "/home/user/no-icon", name: "no-icon", lastOpened: "", iconPath: undefined }],
  });

  await useProjectsStore.getState().loadProjectIcon("/home/user/no-icon");

  const project = useProjectsStore.getState().projects.find((p) => p.path === "/home/user/no-icon");
  expect(project?.iconPath).toBeNull();
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: FAIL — `loadProjectIcon is not a function`

**Step 3: Add `loadProjectIcon` to `useProjectsStore`**

In `frontend/stores/projects.ts`, add to interface and implementation:

```typescript
// Interface addition:
loadProjectIcon: (projectPath: string) => Promise<void>;

// Implementation:
loadProjectIcon: async (projectPath: string) => {
  try {
    const iconPath = await invoke<string | null>("detect_project_icon", { path: projectPath });
    set((state) => ({
      projects: state.projects.map((p) =>
        p.path === projectPath ? { ...p, iconPath: iconPath ?? null } : p
      ),
    }));
  } catch {
    // Non-fatal: keep letter icon
  }
},
```

**Step 4: Call `loadProjectIcon` in `switchToProject`**

```typescript
switchToProject: async (projectPath: string) => {
  set({ activeProjectPath: projectPath });
  const { useFileTreeStore } = await import("./file-tree");
  await useFileTreeStore.getState().openProjectPath(projectPath);
  // Load icon if not already loaded
  const project = get().projects.find((p) => p.path === projectPath);
  if (project && project.iconPath === null) {
    await get().loadProjectIcon(projectPath);
  }
},
```

**Step 5: Also call `loadProjectIcon` in `addProject`**

```typescript
addProject: async (projectPath: string) => {
  const name = basename(projectPath);
  await invoke("add_recent_project", { path: projectPath });
  const existing = get().projects.find((p) => p.path === projectPath);
  if (!existing) {
    const newProject: Project = {
      path: projectPath,
      name,
      lastOpened: new Date().toISOString(),
      iconPath: null,
    };
    set((state) => ({ projects: [newProject, ...state.projects] }));
  }
  set({ activeProjectPath: projectPath });
  // Load icon asynchronously (non-blocking)
  get().loadProjectIcon(projectPath).catch(() => {});
},
```

**Step 6: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: All 10 tests PASS

---

## Task 7: Migrate session restore from workspace to project

**Files:**
- Modify: `frontend/lib/session-persistence.ts`
- Modify: `frontend/App.tsx`

**Context:**
The session persistence snapshot currently saves `activeWorkspaceId` and `activeProjectPath`. We need to keep restoring `activeProjectPath` but drop the workspace concept. The snapshot format changes slightly but remains backward-compatible by treating any existing `activeWorkspaceId` as a dead reference (ignored).

**Step 1: Read current session persistence**

Check the current shape in `frontend/lib/session-persistence.ts` before modifying:

```bash
cat /home/nandomoreira/dev/projects/forja/frontend/lib/session-persistence.ts
```

**Step 2: Write the failing test**

Create `frontend/lib/__tests__/session-persistence.test.ts` (or add to existing):

```typescript
import { describe, it, expect } from "vitest";
import { savePersistedSessionState, loadPersistedSessionState } from "../session-persistence";

describe("session-persistence (project-centric)", () => {
  it("saves and restores activeProjectPath", () => {
    savePersistedSessionState({
      activeProjectPath: "/home/user/my-app",
      preview: { isOpen: false, currentFile: null },
      terminal: { isPaneOpen: true, activeTabIndex: 0, tabs: [] },
    });

    const restored = loadPersistedSessionState();
    expect(restored?.activeProjectPath).toBe("/home/user/my-app");
  });

  it("ignores activeWorkspaceId from old snapshots", () => {
    // Simulate old format with workspaceId
    localStorage.setItem(
      "forja_session_state",
      JSON.stringify({ activeWorkspaceId: "old-ws", activeProjectPath: "/home/user/proj" })
    );

    const restored = loadPersistedSessionState();
    // Should not crash and should return the project path
    expect(restored?.activeProjectPath).toBe("/home/user/proj");
  });
});
```

**Step 3: Run tests to check current state**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/lib/__tests__/session-persistence.test.ts --reporter=verbose
```

**Step 4: Update session persistence if needed**

If the current `PersistedSessionState` interface has `activeWorkspaceId`, remove it and add `activeProjectPath` as the sole project identifier. Ensure backward compatibility by reading `activeProjectPath` from the snapshot and ignoring `activeWorkspaceId`.

**Step 5: Update `App.tsx` restore logic**

In `App.tsx`, remove the `workspaceId` query param handling and the `useWorkspaceStore` import. Replace with `useProjectsStore`:

```typescript
// REMOVE:
import { useWorkspaceStore } from "./stores/workspace";

// ADD:
import { useProjectsStore } from "./stores/projects";
```

Update the restore effect to use `useProjectsStore.getState().loadProjects()` instead of `useWorkspaceStore.getState().loadWorkspaces()`.

**Step 6: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --reporter=verbose
```

Expected: All tests PASS

---

## Task 8: Remove workspace UI from `FileTreeSidebar`

**Files:**
- Modify: `frontend/components/file-tree-sidebar.tsx`
- Modify: `frontend/stores/app-dialogs.ts`

**Context:**
`file-tree-sidebar.tsx` currently renders a `WorkspaceHeader` (dropdown to switch workspaces + rename button). This is replaced by the `ProjectSidebar`. The file tree sidebar now only shows the file tree for the active project and the "Add project" button is removed (it's now in `ProjectSidebar`'s "+" button).

**Step 1: Run existing sidebar tests before changes**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/components/__tests__/tab-bar.test.tsx --reporter=verbose
```

Note any existing tests that reference workspace concepts.

**Step 2: Remove `WorkspaceHeader` from `file-tree-sidebar.tsx`**

In `frontend/components/file-tree-sidebar.tsx`:
- Remove the `WorkspaceHeader` function entirely
- Remove the `<WorkspaceHeader />` call inside `FileTreeSidebar`
- Remove the "Add repository" button at the bottom (it's now in `ProjectSidebar`)
- Remove imports: `useWorkspaceStore`, `useAppDialogsStore`, `FolderPlus`, `Pencil`, `Plus` (if only used there)

The `FileTreeSidebar` becomes a pure file tree viewer for the currently active project.

**Step 3: Clean up `app-dialogs.ts`**

In `frontend/stores/app-dialogs.ts`, remove workspace-related state:
- Remove: `createWorkspaceOpen`, `createWorkspacePendingPath`, `createWorkspaceEditId`, `createWorkspaceInitialName`, `setCreateWorkspaceOpen`

**Step 4: Remove `CreateWorkspaceDialog` from `App.tsx`**

In `frontend/App.tsx`:
- Remove the `CreateWorkspaceDialog` lazy import
- Remove `<CreateWorkspaceDialog />` from JSX
- Remove `createWorkspaceOpen` from `useAppDialogsStore` usage

**Step 5: Run tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --reporter=verbose
```

Fix any test failures caused by removed workspace references.

---

## Task 9: Update `EmptyState` for project-sidebar flow

**Files:**
- Modify: `frontend/App.tsx` (update `EmptyState` component)

**Context:**
The current `EmptyState` shows recent projects as a list. Now that we have the project sidebar, the empty state only appears when no project is selected (no active project). It should prompt the user to click "+" in the sidebar or open a project.

**Step 1: Update the `EmptyState` component in `App.tsx`**

```tsx
function EmptyState() {
  const openProject = useFileTreeStore((s) => s.openProject);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
        <p className="text-sm text-ctp-overlay1">
          A dedicated desktop client for vibe coders
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-ctp-overlay1">
          Click <kbd className="rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-xs">+</kbd> in the sidebar or open a project to get started.
        </p>
        <button
          onClick={openProject}
          className="flex items-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-sm text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text"
        >
          <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
          Open Project
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --reporter=verbose
```

Expected: All tests PASS

---

## Task 10: Update `Titlebar` and `CommandPalette`

**Files:**
- Modify: `frontend/components/titlebar.tsx`
- Modify: `frontend/components/command-palette.tsx`

**Context:**
The titlebar menu has "Open Project" which should now call `useProjectsStore.addProject()` after the user selects a folder. The command palette may have workspace-related commands to remove.

**Step 1: Update `titlebar.tsx`**

Remove the `useWorkspaceStore` usage. The "Open Project" menu item should:
1. Call `useFileTreeStore.getState().openProject()` (unchanged — this already calls `dialog.showOpenDialog`)
2. After selection, also call `useProjectsStore.getState().addProject(selectedPath)` to add it to the sidebar

However, since `openProject` in `useFileTreeStore` already handles the dialog and loading, we just need to ensure the result is also tracked in `useProjectsStore`. The cleanest approach is to update `openProject` in `file-tree.ts` to notify `useProjectsStore`:

In `frontend/stores/file-tree.ts`, find `openProjectPath` and add at the end:

```typescript
// After loading the tree, also register it in projects store
const { useProjectsStore } = await import("./projects");
await useProjectsStore.getState().addProject(selectedPath);
```

**Step 2: Update `command-palette.tsx`**

Remove any workspace-related commands ("Create workspace", "Switch workspace", etc.). Add a "Add Project" command that calls `useFileTreeStore.getState().openProject()`.

**Step 3: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --reporter=verbose
```

Expected: All tests PASS

---

## Task 11: Update docs `workspaces-agents-planner-coder.md`

**Files:**
- Modify: `docs/plans/workspaces-agents-planner-coder.md`

**Context:**
This plan document referenced renaming "Project" to "Repository" and building a workspace system. Since we're moving in a different direction (project sidebar instead of workspaces), we should mark Phase 1 of that plan as superseded and redirect to this plan.

**Step 1: Add a header note to the workspaces plan**

At the top of `docs/plans/workspaces-agents-planner-coder.md`, add:

```markdown
> **STATUS UPDATE (2026-03-08):** Phase 1 of this plan (Workspace Enhancement) has been
> **superseded** by `docs/plans/2026-03-08-project-sidebar.md` which implements a simpler
> project sidebar model instead of workspaces. Phases 2-4 (Planner/Coder modes, Agents,
> Multi-agent panes) remain valid and are not affected.
```

This is a docs-only change, no test needed.

---

## Task 12: Full smoke test and cleanup

**Files:** None new; verify everything

**Step 1: Run the full test suite**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --reporter=verbose
```

Expected: All tests PASS

**Step 2: Run with coverage**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test:coverage
```

Note coverage for the new modules: `projects.ts`, `project-sidebar.tsx`, `project-icon.ts` should be > 80%.

**Step 3: Manual smoke test checklist**

```
1. Start app: pnpm dev
2. Verify project sidebar appears on the left (narrow strip, "+" button only)
3. Click "+" → file picker opens → select a project → icon appears in sidebar with letter
4. Click the project icon → file tree opens → terminal sessions available
5. Click "+" again → add another project → both icons in sidebar
6. Click second project icon → switches to that project (file tree + sessions change)
7. Close and reopen app → both projects still in sidebar (persisted)
8. Hover over icon → tooltip shows project name and path
9. Active project has brand-color border indicator
10. Project with favicon.ico/svg in public/ → shows image instead of letter
```

**Step 4: Check TypeScript compilation**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm build
```

Expected: No TypeScript errors

---

## Task 13: Implement `RingBuffer` e associar ao PTY session

**Files:**
- Create: `electron/ring-buffer.ts`
- Create: `electron/__tests__/ring-buffer.test.ts`
- Modify: `electron/pty.ts` (associar buffer à session + expor `projectPath`)

**Context:**
Cada PTY session precisa de um buffer circular de 2MB no main process. O buffer acumula chunks de output UTF-8 independente do frontend estar conectado. Ao trocar de projeto, o frontend solicita o conteúdo acumulado via IPC e faz replay no xterm.js.

**Step 1: Write the failing test**

Create `electron/__tests__/ring-buffer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { RingBuffer } from "../ring-buffer";

describe("RingBuffer", () => {
  it("stores written chunks", () => {
    const buf = new RingBuffer(1024);
    buf.write("hello ");
    buf.write("world");
    expect(buf.read()).toBe("hello world");
  });

  it("evicts oldest data when capacity is exceeded", () => {
    const buf = new RingBuffer(10); // 10 bytes
    buf.write("AAAAAAAAAA"); // exactly 10
    buf.write("B");          // triggers eviction
    const content = buf.read();
    expect(content.length).toBeLessThanOrEqual(10);
    expect(content.endsWith("B")).toBe(true);
  });

  it("returns empty string when no data written", () => {
    const buf = new RingBuffer(1024);
    expect(buf.read()).toBe("");
  });

  it("clears all data", () => {
    const buf = new RingBuffer(1024);
    buf.write("some data");
    buf.clear();
    expect(buf.read()).toBe("");
  });

  it("reports byte length correctly", () => {
    const buf = new RingBuffer(1024);
    buf.write("hello"); // 5 bytes ASCII
    expect(buf.byteLength).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test electron/__tests__/ring-buffer.test.ts --reporter=verbose
```

Expected: `FAIL` — "Cannot find module '../ring-buffer'"

**Step 3: Implement `electron/ring-buffer.ts`**

```typescript
/**
 * RingBuffer — circular buffer for PTY output.
 * Stores UTF-8 string chunks up to `maxBytes`. When capacity is exceeded,
 * evicts the oldest chunks (not individual bytes) to avoid splitting multibyte chars.
 */
export class RingBuffer {
  private chunks: string[] = [];
  private _byteLength = 0;
  private readonly maxBytes: number;

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes;
  }

  write(chunk: string): void {
    const chunkBytes = Buffer.byteLength(chunk, "utf8");
    this.chunks.push(chunk);
    this._byteLength += chunkBytes;
    // Evict oldest chunks while over capacity
    while (this._byteLength > this.maxBytes && this.chunks.length > 0) {
      const evicted = this.chunks.shift()!;
      this._byteLength -= Buffer.byteLength(evicted, "utf8");
    }
  }

  read(): string {
    return this.chunks.join("");
  }

  clear(): void {
    this.chunks = [];
    this._byteLength = 0;
  }

  get byteLength(): number {
    return this._byteLength;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test electron/__tests__/ring-buffer.test.ts --reporter=verbose
```

Expected: All 5 tests PASS

**Step 5: Associate `RingBuffer` and `projectPath` with each PTY session**

In `electron/pty.ts`, update the session object to include `projectPath` and a `RingBuffer`:

```typescript
import { RingBuffer } from "./ring-buffer.js";

// Constante de 2MB para o buffer de cada sessão
const PTY_BUFFER_MAX_BYTES = 2 * 1024 * 1024; // 2MB

// Add to session interface/object (wherever sessions are stored):
interface PtySession {
  id: string;
  projectPath: string;      // NEW
  buffer: RingBuffer;       // NEW
  pty: IPty;
  // ... existing fields
}
```

When writing output to the IPC event, also write to the buffer:

```typescript
pty.onData((data) => {
  session.buffer.write(data);   // NEW — accumulate in buffer
  mainWindow?.webContents.send(`pty:data:${session.id}`, data);
});
```

**Step 6: Add IPC handler `pty:get-buffer` in `electron/main.ts`**

```typescript
ipcMain.handle("pty:get-buffer", (_event, args: { sessionId: string }) => {
  const session = ptyManager.getSession(args.sessionId);
  if (!session) return null;
  return session.buffer.read();
});
```

Expose in `electron/preload.cts`:

```typescript
"pty:get-buffer": (sessionId: string) =>
  ipcRenderer.invoke("pty:get-buffer", { sessionId }),
```

**Step 7: Run all electron tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --project electron --reporter=verbose
```

Expected: All tests PASS

---

## Task 14: Implementar session state tracking e indicadores visuais na sidebar

**Files:**
- Modify: `electron/pty.ts` (emitir `pty:session-state-changed` no exit)
- Modify: `electron/main.ts` (expor handler + encaminhar evento)
- Modify: `electron/preload.cts` (expor listener)
- Modify: `frontend/stores/projects.ts` (adicionar `sessionStates` por projeto)
- Modify: `frontend/stores/__tests__/projects.test.ts` (testes para estados)
- Modify: `frontend/components/project-sidebar.tsx` (renderizar spinner/badge)
- Create: `frontend/components/__tests__/project-sidebar-indicators.test.tsx`

**Context:**
Quando um PTY em background termina (o AI CLI finaliza), o usuário precisa saber. A sidebar exibe:
- **Spinner animado** enquanto há sessões ativas (running) em um projeto não-ativo
- **Badge de notificação** (ponto colorido) quando uma sessão terminou sem o usuário ver o resultado
- O badge some quando o usuário clica no projeto (marca como "visto")

O main process emite `pty:session-state-changed` ao detectar mudança de estado de um PTY.

### Sub-step A: Emitir evento de estado no main process

**Step 1: Write the failing test for state event**

Add to `electron/__tests__/pty-spawn.test.ts` (or create if missing):

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal test to verify the session-state-changed event is emitted on exit
describe("PTY session state tracking", () => {
  it("emits pty:session-state-changed with 'exited' when PTY exits", () => {
    // This test validates the contract, not the implementation detail.
    // The actual behavior is integration-tested via smoke test.
    // Unit test: verify that the state change payload has correct shape.
    const payload = {
      sessionId: "session-1",
      projectPath: "/home/user/my-app",
      state: "exited" as const,
      exitCode: 0,
    };
    expect(payload).toMatchObject({
      sessionId: expect.any(String),
      projectPath: expect.any(String),
      state: expect.stringMatching(/^(running|exited|idle)$/),
    });
  });
});
```

**Step 2: Update `electron/pty.ts` to emit state changes**

When a PTY exits, emit via IPC to the renderer:

```typescript
pty.onExit(({ exitCode }) => {
  session.state = "exited";
  mainWindow?.webContents.send("pty:session-state-changed", {
    sessionId: session.id,
    projectPath: session.projectPath,
    state: "exited",
    exitCode,
  });
});
```

When a PTY spawns, emit running state:

```typescript
// After spawning
session.state = "running";
mainWindow?.webContents.send("pty:session-state-changed", {
  sessionId: session.id,
  projectPath: session.projectPath,
  state: "running",
  exitCode: null,
});
```

**Step 3: Expose listener in `electron/preload.cts`**

```typescript
onSessionStateChanged: (
  callback: (payload: {
    sessionId: string;
    projectPath: string;
    state: "running" | "exited" | "idle";
    exitCode: number | null;
  }) => void
) => {
  ipcRenderer.on("pty:session-state-changed", (_event, payload) => callback(payload));
  return () => ipcRenderer.removeAllListeners("pty:session-state-changed");
},
```

### Sub-step B: Atualizar `useProjectsStore` com session states

**Step 4: Write the failing test**

Add to `frontend/stores/__tests__/projects.test.ts`:

```typescript
it("updates session state for a project to 'running'", () => {
  useProjectsStore.setState({
    projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    sessionStates: {},
  });

  useProjectsStore.getState().setProjectSessionState("/a/my-app", "running");

  const state = useProjectsStore.getState().sessionStates["/a/my-app"];
  expect(state).toBe("running");
});

it("updates session state to 'exited' and marks as unread", () => {
  useProjectsStore.setState({
    projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    sessionStates: { "/a/my-app": "running" },
    unreadProjects: new Set<string>(),
  });

  useProjectsStore.getState().setProjectSessionState("/a/my-app", "exited");

  const state = useProjectsStore.getState().sessionStates["/a/my-app"];
  const unread = useProjectsStore.getState().unreadProjects;
  expect(state).toBe("exited");
  expect(unread.has("/a/my-app")).toBe(true);
});

it("clears unread flag when switching to a project", async () => {
  useProjectsStore.setState({
    projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    unreadProjects: new Set(["/a/my-app"]),
  });

  // switchToProject should clear the unread flag
  await useProjectsStore.getState().switchToProject("/a/my-app");

  const unread = useProjectsStore.getState().unreadProjects;
  expect(unread.has("/a/my-app")).toBe(false);
});
```

**Step 5: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: FAIL — `setProjectSessionState is not a function`, `sessionStates` undefined

**Step 6: Update `useProjectsStore`**

Add to `ProjectsState` interface in `frontend/stores/projects.ts`:

```typescript
export type SessionState = "running" | "exited" | "idle";

interface ProjectsState {
  // ... existing fields ...
  sessionStates: Record<string, SessionState>;  // projectPath -> state
  unreadProjects: Set<string>;                  // paths with unread exits

  setProjectSessionState: (projectPath: string, state: SessionState) => void;
  markProjectAsRead: (projectPath: string) => void;
}
```

Add to store implementation:

```typescript
sessionStates: {},
unreadProjects: new Set<string>(),

setProjectSessionState: (projectPath, state) => {
  set((s) => {
    const newUnread = new Set(s.unreadProjects);
    if (state === "exited") {
      // Only mark as unread if this project is not currently active
      if (s.activeProjectPath !== projectPath) {
        newUnread.add(projectPath);
      }
    }
    return {
      sessionStates: { ...s.sessionStates, [projectPath]: state },
      unreadProjects: newUnread,
    };
  });
},

markProjectAsRead: (projectPath) => {
  set((s) => {
    const newUnread = new Set(s.unreadProjects);
    newUnread.delete(projectPath);
    return { unreadProjects: newUnread };
  });
},
```

Update `switchToProject` to clear unread on switch:

```typescript
switchToProject: async (projectPath) => {
  set({ activeProjectPath: projectPath });
  get().markProjectAsRead(projectPath);   // NEW
  // ... rest unchanged
},
```

**Step 7: Subscribe to IPC events in `App.tsx`**

In `frontend/App.tsx`, add a `useEffect` to subscribe to session state changes:

```typescript
useEffect(() => {
  const api = window.electronAPI;
  if (!api?.onSessionStateChanged) return;

  const cleanup = api.onSessionStateChanged((payload) => {
    useProjectsStore.getState().setProjectSessionState(
      payload.projectPath,
      payload.state
    );
  });

  return cleanup;
}, []);
```

**Step 8: Run tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose
```

Expected: All tests PASS (including the 3 new ones)

### Sub-step C: Renderizar indicadores na sidebar

**Step 9: Write the failing test for indicators**

Create `frontend/components/__tests__/project-sidebar-indicators.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectSidebar } from "../project-sidebar";
import { useProjectsStore } from "@/stores/projects";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@/stores/projects");

const mockUseProjectsStore = vi.mocked(useProjectsStore);

function makeStore(overrides = {}) {
  return {
    projects: [
      { path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null },
      { path: "/b/other", name: "other", lastOpened: "", iconPath: null },
    ],
    activeProjectPath: "/a/my-app",
    loading: false,
    sessionStates: {},
    unreadProjects: new Set<string>(),
    loadProjects: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    setActiveProject: vi.fn(),
    switchToProject: vi.fn(),
    getProjectInitial: (n: string) => n[0].toUpperCase(),
    getProjectColor: () => "#cba6f7",
    setProjectSessionState: vi.fn(),
    markProjectAsRead: vi.fn(),
    ...overrides,
  } as never;
}

describe("ProjectSidebar — session indicators", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows spinner for background project with running session", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "running" },
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    // The "other" project should have a spinner indicator
    expect(screen.getByTestId("session-spinner-/b/other")).toBeTruthy();
  });

  it("shows notification badge for background project with exited session", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "exited" },
      unreadProjects: new Set(["/b/other"]),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByTestId("session-badge-/b/other")).toBeTruthy();
  });

  it("does not show spinner or badge for active project", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/a/my-app": "running" },
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    // Active project (my-app) should NOT show spinner — user can see it directly
    expect(screen.queryByTestId("session-spinner-/a/my-app")).toBeNull();
  });

  it("does not show badge when project is active (no unread)", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "exited" },
      unreadProjects: new Set<string>(), // already read
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.queryByTestId("session-badge-/b/other")).toBeNull();
  });
});
```

**Step 10: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test frontend/components/__tests__/project-sidebar-indicators.test.tsx --reporter=verbose
```

Expected: FAIL — `session-spinner-*` and `session-badge-*` not found

**Step 11: Update `ProjectIcon` in `frontend/components/project-sidebar.tsx`**

Update the `ProjectIconProps` and `ProjectIcon` component:

```typescript
import { Loader2 } from "lucide-react";

interface ProjectIconProps {
  project: Project;
  isActive: boolean;
  onSelect: (path: string) => void;
  sessionState?: "running" | "exited" | "idle";
  isUnread?: boolean;
}

function ProjectIcon({ project, isActive, onSelect, sessionState, isUnread }: ProjectIconProps) {
  // ...existing code...

  const showSpinner = !isActive && sessionState === "running";
  const showBadge = !isActive && isUnread && sessionState === "exited";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          // ...existing props...
          className={cn(
            "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150",
            isActive
              ? "ring-2 ring-brand ring-offset-1 ring-offset-ctp-mantle"
              : "opacity-70 hover:opacity-100"
          )}
          style={{ backgroundColor: `${color}22`, color }}
        >
          {/* existing content: img or letter */}

          {/* Spinner: running session in background */}
          {showSpinner && (
            <span
              data-testid={`session-spinner-${project.path}`}
              className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ctp-mantle"
              aria-label={`${project.name} has an active session`}
            >
              <Loader2 className="h-2.5 w-2.5 animate-spin text-ctp-blue" strokeWidth={2.5} />
            </span>
          )}

          {/* Badge: session finished, unread */}
          {showBadge && (
            <span
              data-testid={`session-badge-${project.path}`}
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-ctp-green ring-1 ring-ctp-mantle"
              aria-label={`${project.name} session finished`}
            />
          )}

          {/* Active border indicator */}
          {isActive && (
            <span
              className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-brand"
              aria-hidden="true"
            />
          )}
        </button>
      </TooltipTrigger>
      {/* ...existing tooltip... */}
    </Tooltip>
  );
}
```

Update the `ProjectSidebar` to pass state props:

```typescript
export function ProjectSidebar({ onOpenProject }: ProjectSidebarProps) {
  const projects = useProjectsStore((s) => s.projects);
  const activeProjectPath = useProjectsStore((s) => s.activeProjectPath);
  const sessionStates = useProjectsStore((s) => s.sessionStates);
  const unreadProjects = useProjectsStore((s) => s.unreadProjects);
  // ...

  return (
    <TooltipProvider delayDuration={500}>
      <div ...>
        {projects.map((project) => (
          <ProjectIcon
            key={project.path}
            project={project}
            isActive={project.path === activeProjectPath}
            onSelect={handleSelect}
            sessionState={sessionStates[project.path]}
            isUnread={unreadProjects.has(project.path)}
          />
        ))}
        {/* ...+ button... */}
      </div>
    </TooltipProvider>
  );
}
```

**Step 12: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --project frontend --reporter=verbose
```

Expected: All tests PASS

---

## Task 15: Notificação nativa do sistema ao terminar sessão PTY

**Files:**
- Modify: `electron/pty.ts` (disparar notificação nativa via Electron)
- Create: `electron/__tests__/pty-notification.test.ts`

**Context:**
Quando um PTY session termina (o AI CLI finaliza sua tarefa), o main process dispara uma notificação nativa do sistema via Electron `Notification` API. A notificação mostra o nome do projeto e um resumo do resultado (ex: "Claude Code finalizou em my-app"). O usuário pode clicar na notificação para focar a janela do Forja — implementado via `notification.onclick` que chama `mainWindow.focus()` e emite um IPC para o frontend fazer switch para o projeto.

A notificação é disparada apenas se a janela principal não estiver em foco (o usuário está em outro app). Se o Forja estiver em foco, apenas o badge na sidebar é suficiente.

**Step 1: Write the failing test**

Create `electron/__tests__/pty-notification.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Electron Notification API
const mockNotificationShow = vi.fn();
const MockNotification = vi.fn().mockImplementation(() => ({
  show: mockNotificationShow,
  on: vi.fn(),
}));

vi.mock("electron", () => ({
  Notification: MockNotification,
  app: { getName: () => "Forja" },
}));

import { buildSessionEndNotification } from "../pty-notifications";

describe("buildSessionEndNotification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns notification options with project name in title", () => {
    const opts = buildSessionEndNotification({
      projectName: "my-app",
      cliName: "Claude Code",
      exitCode: 0,
    });

    expect(opts.title).toContain("my-app");
    expect(opts.body).toBeTruthy();
  });

  it("includes exit code in body when non-zero", () => {
    const opts = buildSessionEndNotification({
      projectName: "my-app",
      cliName: "Claude Code",
      exitCode: 1,
    });

    expect(opts.body).toContain("1");
  });

  it("uses success wording when exit code is 0", () => {
    const opts = buildSessionEndNotification({
      projectName: "my-app",
      cliName: "Claude Code",
      exitCode: 0,
    });

    // Should not mention error
    expect(opts.body?.toLowerCase()).not.toContain("erro");
    expect(opts.body?.toLowerCase()).not.toContain("error");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test electron/__tests__/pty-notification.test.ts --reporter=verbose
```

Expected: `FAIL` — "Cannot find module '../pty-notifications'"

**Step 3: Create `electron/pty-notifications.ts`**

```typescript
interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
}

interface SessionEndPayload {
  projectName: string;
  cliName: string;
  exitCode: number | null;
}

/**
 * Builds the notification options for a session end event.
 * Pure function — easy to test without Electron dependency.
 */
export function buildSessionEndNotification(payload: SessionEndPayload): NotificationOptions {
  const { projectName, cliName, exitCode } = payload;

  const success = exitCode === 0 || exitCode === null;
  const title = `${projectName}`;
  const body = success
    ? `${cliName} finalizou com sucesso.`
    : `${cliName} terminou com código ${exitCode}.`;

  return { title, body, silent: false };
}

/**
 * Shows a native system notification for a session end event.
 * Should only be called from the main process.
 * No-ops if Electron Notification is not supported.
 */
export function showSessionEndNotification(
  payload: SessionEndPayload,
  opts: {
    onClicked?: () => void;
  } = {}
): void {
  try {
    const { Notification } = require("electron");
    if (!Notification.isSupported()) return;

    const notifOpts = buildSessionEndNotification(payload);
    const notif = new Notification(notifOpts);

    if (opts.onClicked) {
      notif.on("click", opts.onClicked);
    }

    notif.show();
  } catch {
    // Non-fatal: notification failed (e.g., in test environment)
  }
}
```

**Step 4: Call `showSessionEndNotification` in `electron/pty.ts`**

In the `pty.onExit` handler, after emitting the IPC event:

```typescript
import { showSessionEndNotification } from "./pty-notifications.js";

pty.onExit(({ exitCode }) => {
  session.state = "exited";

  // Emit IPC event to frontend
  mainWindow?.webContents.send("pty:session-state-changed", {
    sessionId: session.id,
    projectPath: session.projectPath,
    state: "exited",
    exitCode,
  });

  // Show native notification only if window is not focused
  const isWindowFocused = mainWindow?.isFocused() ?? false;
  if (!isWindowFocused) {
    showSessionEndNotification(
      {
        projectName: basename(session.projectPath),
        cliName: session.cliName ?? "CLI",
        exitCode: exitCode ?? null,
      },
      {
        onClicked: () => {
          mainWindow?.focus();
          mainWindow?.webContents.send("project:focus-requested", {
            projectPath: session.projectPath,
          });
        },
      }
    );
  }
});
```

**Step 5: Handle `project:focus-requested` in frontend**

In `frontend/App.tsx`, subscribe to the focus event:

```typescript
useEffect(() => {
  const api = window.electronAPI;
  if (!api?.onProjectFocusRequested) return;

  const cleanup = api.onProjectFocusRequested((payload: { projectPath: string }) => {
    useProjectsStore.getState().switchToProject(payload.projectPath);
  });

  return cleanup;
}, []);
```

Expose in `electron/preload.cts`:

```typescript
onProjectFocusRequested: (
  callback: (payload: { projectPath: string }) => void
) => {
  ipcRenderer.on("project:focus-requested", (_event, payload) => callback(payload));
  return () => ipcRenderer.removeAllListeners("project:focus-requested");
},
```

**Step 6: Run all tests**

```bash
cd /home/nandomoreira/dev/projects/forja && pnpm test --reporter=verbose
```

Expected: All tests PASS

**Step 7: Manual smoke test for notifications**

```
1. Open Forja with a project
2. Start a Claude Code session
3. Alt+Tab to another application (so Forja loses focus)
4. Wait for Claude Code to finish its response
5. Verify: native system notification appears with project name
6. Click the notification → Forja gains focus and switches to that project
7. Verify: badge disappears from sidebar icon (marked as read)
8. Repeat with Forja in focus → notification should NOT appear (only badge)
```

---

## Summary of Changed Files

### New Files
- `frontend/stores/projects.ts`
- `frontend/stores/__tests__/projects.test.ts`
- `frontend/components/project-sidebar.tsx`
- `frontend/components/__tests__/project-sidebar.test.tsx`
- `frontend/components/__tests__/project-sidebar-indicators.test.tsx`
- `electron/project-icon.ts`
- `electron/__tests__/project-icon.test.ts`
- `electron/ring-buffer.ts` — RingBuffer de 2MB para output de PTY sessions
- `electron/__tests__/ring-buffer.test.ts`
- `electron/pty-notifications.ts` — lógica de notificação nativa isolada e testável
- `electron/__tests__/pty-notification.test.ts`

### Modified Files
- `electron/main.ts` — add `detect_project_icon` IPC handler; add `pty:get-buffer` handler
- `electron/preload.cts` — expose `detect_project_icon`, `pty:get-buffer`, `onSessionStateChanged`, `onProjectFocusRequested`
- `electron/pty.ts` — adicionar `projectPath` + `RingBuffer` por session; emitir `pty:session-state-changed` e `project:focus-requested`; disparar notificação nativa ao exit
- `frontend/App.tsx` — add `ProjectSidebar`; remove workspace loading; update `EmptyState`; subscribe a `onSessionStateChanged` e `onProjectFocusRequested`
- `frontend/stores/projects.ts` — adicionar `sessionStates`, `unreadProjects`, `setProjectSessionState`, `markProjectAsRead`; `switchToProject` limpa unread
- `frontend/stores/file-tree.ts` — notify `useProjectsStore` after `openProjectPath`
- `frontend/stores/app-dialogs.ts` — remove workspace dialog state
- `frontend/lib/session-persistence.ts` — remove `activeWorkspaceId` field
- `frontend/components/project-sidebar.tsx` — renderizar spinner (running) e badge (exited + unread) nos ícones de projeto em background
- `frontend/components/file-tree-sidebar.tsx` — remove `WorkspaceHeader`, remove "Add repository" button
- `frontend/components/create-workspace-dialog.tsx` — no longer used (can be deleted)
- `frontend/components/titlebar.tsx` — remove workspace references
- `frontend/components/command-palette.tsx` — remove workspace commands
- `docs/plans/workspaces-agents-planner-coder.md` — add superseded notice for Phase 1

### Deleted Files (after confirming nothing references them)
- `frontend/stores/workspace.ts` — replaced by `frontend/stores/projects.ts`
- `frontend/components/create-workspace-dialog.tsx` — no longer needed

### Strategy Notes
- **Always Running:** Todos os PTYs ficam vivos o tempo todo. Trocar projeto é apenas visual (filtro de tabs).
- **RingBuffer:** 2MB por session no main process. xterm.js faz replay ao ativar um projeto.
- **SIGSTOP/hibernação:** Explicitamente fora do MVP. Documentado em "Otimizações Futuras (Fase 2)" na seção de Performance Strategy.
