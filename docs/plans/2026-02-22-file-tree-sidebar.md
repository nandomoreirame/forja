# File Tree Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use implement-plan to implement this plan task-by-task.

**Goal:** Add a collapsible file tree sidebar with project directory structure, file icons by type, toolbar actions, and "Open Project" menu item.

**Architecture:**

- **Frontend:** React component with Zustand state for sidebar visibility and current directory
- **Backend:** Rust Tauri command to read directory structure recursively with file metadata
- **IPC:** Tauri command `read_directory_tree` returns nested file tree structure

**Tech Stack:**

- React 19 + TypeScript
- Zustand (state management)
- Lucide React (icons)
- shadcn/ui components
- Tauri 2 (Rust backend)
- serde + walkdir (Rust crates)

**Reference:** Warp-style file tree with dark background, expandable directories, file type icons, and toolbar.

---

## Task 1: Add Rust Dependencies and File Tree Types

**Files:**

- Modify: `backend/Cargo.toml`
- Create: `backend/src/file_tree.rs`

**Step 1: Add walkdir dependency to Cargo.toml**

```toml
# Add to [dependencies] section in backend/Cargo.toml
walkdir = "2.5"
```

**Step 2: Run cargo check to verify dependency**

```bash
cd /home/nandomoreira/development/projects/forja-terminal/backend && cargo check
```

Expected: Dependency downloads and compiles successfully

**Step 3: Create file_tree module with types**

```rust
// backend/src/file_tree.rs
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryTree {
    pub root: FileNode,
}
```

**Step 4: Register module in main.rs**

```rust
// Add to backend/src/main.rs after existing modules
mod file_tree;
```

**Step 5: Run cargo check**

```bash
cd /home/nandomoreira/development/projects/forja-terminal/backend && cargo check
```

Expected: PASS (no compilation errors)

**Step 6: Commit**

```bash
git add backend/Cargo.toml backend/Cargo.lock backend/src/file_tree.rs backend/src/main.rs
git commit -m "feat: add file tree types and walkdir dependency"
```

---

## Task 2: Implement Directory Reading Tauri Command

**Files:**

- Modify: `backend/src/file_tree.rs`
- Modify: `backend/src/main.rs`

**Step 1: Write failing test for directory tree reading**

```rust
// Add to backend/src/file_tree.rs

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_read_directory_tree() {
        // Create temp directory structure
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        fs::create_dir(root.join("src")).unwrap();
        fs::write(root.join("src/main.rs"), "fn main() {}").unwrap();
        fs::write(root.join("README.md"), "# Test").unwrap();

        // Test
        let tree = read_directory_tree(root.to_str().unwrap(), 2).unwrap();

        assert_eq!(tree.root.name, root.file_name().unwrap().to_str().unwrap());
        assert_eq!(tree.root.is_dir, true);
        assert!(tree.root.children.is_some());

        let children = tree.root.children.unwrap();
        assert!(children.iter().any(|n| n.name == "src"));
        assert!(children.iter().any(|n| n.name == "README.md"));
    }
}
```

**Step 2: Add tempfile dev dependency**

```toml
# Add to [dev-dependencies] in backend/Cargo.toml
tempfile = "3.12"
```

**Step 3: Run test to verify it fails**

```bash
cd /home/nandomoreira/development/projects/forja-terminal/backend && cargo test test_read_directory_tree
```

Expected: FAIL with "function `read_directory_tree` not defined"

**Step 4: Implement read_directory_tree function**

```rust
// Add to backend/src/file_tree.rs before tests
use std::path::Path;
use walkdir::WalkDir;

pub fn read_directory_tree(path: &str, max_depth: usize) -> Result<DirectoryTree, String> {
    let root_path = Path::new(path);

    if !root_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !root_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let root_node = build_tree_node(root_path, max_depth, 0)?;

    Ok(DirectoryTree { root: root_node })
}

fn build_tree_node(path: &Path, max_depth: usize, current_depth: usize) -> Result<FileNode, String> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let path_str = path.to_str().unwrap_or("").to_string();
    let is_dir = path.is_dir();
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_string());

    let children = if is_dir && current_depth < max_depth {
        let mut child_nodes = Vec::new();

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();

                // Skip hidden files and directories (starting with .)
                if let Some(file_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                    if file_name.starts_with('.') {
                        continue;
                    }
                }

                // Skip node_modules and target directories
                if let Some(file_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                    if file_name == "node_modules" || file_name == "target" {
                        continue;
                    }
                }

                if let Ok(child_node) = build_tree_node(&entry_path, max_depth, current_depth + 1) {
                    child_nodes.push(child_node);
                }
            }
        }

        // Sort: directories first, then alphabetically
        child_nodes.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });

        Some(child_nodes)
    } else {
        None
    };

    Ok(FileNode {
        name,
        path: path_str,
        is_dir,
        children,
        extension,
    })
}
```

**Step 5: Run test to verify it passes**

```bash
cd /home/nandomoreira/development/projects/forja-terminal/backend && cargo test test_read_directory_tree
```

Expected: PASS

**Step 6: Implement Tauri command wrapper**

```rust
// Add to backend/src/file_tree.rs
#[tauri::command]
pub fn read_directory_tree_command(path: String, max_depth: Option<usize>) -> Result<DirectoryTree, String> {
    let depth = max_depth.unwrap_or(3); // Default depth of 3
    read_directory_tree(&path, depth)
}
```

**Step 7: Register command in main.rs**

```rust
// Modify backend/src/main.rs - add to .invoke_handler
.invoke_handler(tauri::generate_handler![
    greet,
    file_tree::read_directory_tree_command
])
```

**Step 8: Run cargo check**

```bash
cd /home/nandomoreira/development/projects/forja-terminal/backend && cargo check
```

Expected: PASS

**Step 9: Commit**

```bash
git add backend/src/file_tree.rs backend/src/main.rs backend/Cargo.toml backend/Cargo.lock
git commit -m "feat: implement directory tree reading with Tauri command"
```

---

## Task 3: Create Frontend File Tree Store (Zustand)

**Files:**

- Create: `frontend/stores/file-tree.ts`
- Modify: `frontend/App.tsx` (import store to verify types)

**Step 1: Write failing test for file tree store**

```typescript
// Create: frontend/stores/file-tree.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useFileTreeStore } from './file-tree'

describe('FileTreeStore', () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: false,
      currentPath: null,
      tree: null,
    })
  })

  it('should toggle sidebar visibility', () => {
    const { toggleSidebar, isOpen } = useFileTreeStore.getState()

    expect(isOpen).toBe(false)
    toggleSidebar()
    expect(useFileTreeStore.getState().isOpen).toBe(true)
    toggleSidebar()
    expect(useFileTreeStore.getState().isOpen).toBe(false)
  })

  it('should set current path', () => {
    const { setCurrentPath } = useFileTreeStore.getState()

    setCurrentPath('/test/path')
    expect(useFileTreeStore.getState().currentPath).toBe('/test/path')
  })

  it('should set tree data', () => {
    const { setTree } = useFileTreeStore.getState()
    const mockTree = {
      root: {
        name: 'project',
        path: '/test',
        isDir: true,
        children: [],
        extension: null,
      },
    }

    setTree(mockTree)
    expect(useFileTreeStore.getState().tree).toEqual(mockTree)
  })
})
```

**Step 2: Install vitest if not already present**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm add -D vitest @vitest/ui
```

**Step 3: Add test script to package.json**

```json
// Modify package.json scripts section
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 4: Run test to verify it fails**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run file-tree.test.ts
```

Expected: FAIL with "Cannot find module './file-tree'"

**Step 5: Create file tree store**

```typescript
// Create: frontend/stores/file-tree.ts
import { create } from 'zustand'

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
  extension?: string | null
}

export interface DirectoryTree {
  root: FileNode
}

interface FileTreeState {
  isOpen: boolean
  currentPath: string | null
  tree: DirectoryTree | null
  expandedPaths: Set<string>

  toggleSidebar: () => void
  setCurrentPath: (path: string) => void
  setTree: (tree: DirectoryTree | null) => void
  toggleExpanded: (path: string) => void
  isExpanded: (path: string) => boolean
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  isOpen: false,
  currentPath: null,
  tree: null,
  expandedPaths: new Set<string>(),

  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),

  setCurrentPath: (path: string) => set({ currentPath: path }),

  setTree: (tree: DirectoryTree | null) => set({ tree }),

  toggleExpanded: (path: string) => {
    const expanded = new Set(get().expandedPaths)
    if (expanded.has(path)) {
      expanded.delete(path)
    } else {
      expanded.add(path)
    }
    set({ expandedPaths: expanded })
  },

  isExpanded: (path: string) => get().expandedPaths.has(path),
}))
```

**Step 6: Run test to verify it passes**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run file-tree.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add frontend/stores/file-tree.ts frontend/stores/file-tree.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add file tree Zustand store with tests"
```

---

## Task 4: Create File Icon Component

**Files:**

- Create: `frontend/components/file-icon.tsx`
- Create: `frontend/components/file-icon.test.tsx`

**Step 1: Write failing test for file icon**

```typescript
// Create: frontend/components/file-icon.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FileIcon } from './file-icon'

describe('FileIcon', () => {
  it('should render folder icon for directories', () => {
    const { container } = render(<FileIcon isDir={true} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should render TypeScript icon for .ts files', () => {
    const { container } = render(<FileIcon isDir={false} extension="ts" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should render JSON icon for .json files', () => {
    const { container } = render(<FileIcon isDir={false} extension="json" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should render default file icon for unknown extensions', () => {
    const { container } = render(<FileIcon isDir={false} extension="xyz" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })
})
```

**Step 2: Install testing libraries**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Create vitest setup file**

```typescript
// Create: frontend/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

**Step 4: Add vitest config**

```typescript
// Create: vitest.config.ts in project root
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./frontend/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
    },
  },
})
```

**Step 5: Run test to verify it fails**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run file-icon.test.tsx
```

Expected: FAIL with "Cannot find module './file-icon'"

**Step 6: Create file icon component**

```typescript
// Create: frontend/components/file-icon.tsx
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  type LucideIcon,
} from 'lucide-react'

interface FileIconProps {
  isDir: boolean
  extension?: string | null
  isOpen?: boolean
  className?: string
}

const extensionIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  // TypeScript/JavaScript
  ts: { icon: FileCode, color: 'text-blue-400' },
  tsx: { icon: FileCode, color: 'text-blue-400' },
  js: { icon: FileCode, color: 'text-yellow-400' },
  jsx: { icon: FileCode, color: 'text-yellow-400' },

  // Config/Data
  json: { icon: FileJson, color: 'text-yellow-500' },
  toml: { icon: FileText, color: 'text-orange-400' },
  yaml: { icon: FileText, color: 'text-red-400' },
  yml: { icon: FileText, color: 'text-red-400' },

  // Rust
  rs: { icon: FileCode, color: 'text-orange-500' },

  // Markdown
  md: { icon: FileText, color: 'text-blue-300' },
  mdx: { icon: FileText, color: 'text-blue-300' },

  // Web
  html: { icon: FileCode, color: 'text-orange-400' },
  css: { icon: FileCode, color: 'text-blue-500' },
}

export function FileIcon({ isDir, extension, isOpen = false, className = '' }: FileIconProps) {
  if (isDir) {
    const Icon = isOpen ? FolderOpen : Folder
    return <Icon className={`h-4 w-4 text-zinc-400 ${className}`} strokeWidth={1.5} />
  }

  const iconConfig = extension ? extensionIconMap[extension.toLowerCase()] : null

  if (iconConfig) {
    const { icon: Icon, color } = iconConfig
    return <Icon className={`h-4 w-4 ${color} ${className}`} strokeWidth={1.5} />
  }

  return <File className={`h-4 w-4 text-zinc-500 ${className}`} strokeWidth={1.5} />
}
```

**Step 7: Run test to verify it passes**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run file-icon.test.tsx
```

Expected: PASS

**Step 8: Commit**

```bash
git add frontend/components/file-icon.tsx frontend/components/file-icon.test.tsx frontend/test/setup.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add file icon component with extension mapping"
```

---

## Task 5: Create File Tree Sidebar Component

**Files:**

- Create: `frontend/components/file-tree-sidebar.tsx`
- Create: `frontend/components/file-tree-node.tsx`

**Step 1: Write basic test for sidebar visibility**

```typescript
// Create: frontend/components/file-tree-sidebar.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileTreeSidebar } from './file-tree-sidebar'
import { useFileTreeStore } from '@/stores/file-tree'

describe('FileTreeSidebar', () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: false,
      currentPath: null,
      tree: null,
    })
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(<FileTreeSidebar />)
    const sidebar = container.querySelector('[data-testid="file-tree-sidebar"]')
    expect(sidebar).toBeNull()
  })

  it('should render when isOpen is true', () => {
    useFileTreeStore.setState({ isOpen: true })
    const { container } = render(<FileTreeSidebar />)
    const sidebar = container.querySelector('[data-testid="file-tree-sidebar"]')
    expect(sidebar).toBeTruthy()
  })

  it('should display project name when tree is loaded', () => {
    useFileTreeStore.setState({
      isOpen: true,
      tree: {
        root: {
          name: 'forja-terminal',
          path: '/test/forja-terminal',
          isDir: true,
          children: [],
        },
      },
    })

    render(<FileTreeSidebar />)
    expect(screen.getByText('forja-terminal')).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run file-tree-sidebar.test.tsx
```

Expected: FAIL with "Cannot find module './file-tree-sidebar'"

**Step 3: Create file tree node component (recursive)**

```typescript
// Create: frontend/components/file-tree-node.tsx
import { ChevronRight } from 'lucide-react'
import { FileIcon } from './file-icon'
import { useFileTreeStore, type FileNode } from '@/stores/file-tree'

interface FileTreeNodeProps {
  node: FileNode
  depth: number
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const { isExpanded, toggleExpanded } = useFileTreeStore()
  const expanded = isExpanded(node.path)

  const handleClick = () => {
    if (node.isDir) {
      toggleExpanded(node.path)
    } else {
      // TODO: Open file in editor (future task)
      console.log('Open file:', node.path)
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 cursor-pointer transition-colors duration-100 group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDir && (
          <ChevronRight
            className={`h-3 w-3 text-zinc-500 transition-transform duration-150 ${
              expanded ? 'rotate-90' : ''
            }`}
            strokeWidth={1.5}
          />
        )}

        {!node.isDir && <div className="w-3" />}

        <FileIcon
          isDir={node.isDir}
          extension={node.extension}
          isOpen={expanded}
        />

        <span className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate">
          {node.name}
        </span>
      </div>

      {node.isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create file tree sidebar component**

```typescript
// Create: frontend/components/file-tree-sidebar.tsx
import { X, FileSearch, Copy, FilePlus } from 'lucide-react'
import { useFileTreeStore } from '@/stores/file-tree'
import { FileTreeNode } from './file-tree-node'
import { FileIcon } from './file-icon'

export function FileTreeSidebar() {
  const { isOpen, tree, toggleSidebar } = useFileTreeStore()

  if (!isOpen) return null

  return (
    <div
      data-testid="file-tree-sidebar"
      className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col"
    >
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1">
          <button
            className="inline-flex h-7 w-7 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-100 rounded"
            aria-label="New file"
            title="New file"
          >
            <FilePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <button
            className="inline-flex h-7 w-7 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-100 rounded"
            aria-label="Search"
            title="Search"
          >
            <FileSearch className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <button
            className="inline-flex h-7 w-7 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-100 rounded"
            aria-label="Copy path"
            title="Copy path"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <button
          onClick={toggleSidebar}
          className="inline-flex h-7 w-7 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-100 rounded"
          aria-label="Close sidebar"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Project name header */}
      {tree && (
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
          <FileIcon isDir={true} />
          <span className="text-sm font-semibold text-zinc-200">
            {tree.root.name}
          </span>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {tree ? (
          <div className="py-1">
            {tree.root.children?.map((node) => (
              <FileTreeNode key={node.path} node={node} depth={0} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
            No project loaded
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run file-tree-sidebar.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add frontend/components/file-tree-sidebar.tsx frontend/components/file-tree-sidebar.test.tsx frontend/components/file-tree-node.tsx
git commit -m "feat: add file tree sidebar with collapsible nodes"
```

---

## Task 6: Add "Open Project" Menu Item to Titlebar

**Files:**

- Modify: `frontend/components/titlebar.tsx`
- Modify: `frontend/App.tsx` (integrate sidebar and open project)

**Step 1: Write test for open project menu item**

```typescript
// Create: frontend/components/titlebar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Titlebar } from './titlebar'

describe('Titlebar', () => {
  it('should render "Open Project" menu item', async () => {
    render(<Titlebar />)

    // Open menu (need to click the trigger)
    const menuButton = screen.getByLabelText('Menu')
    expect(menuButton).toBeTruthy()
  })
})
```

**Step 2: Run test to verify baseline**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run titlebar.test.tsx
```

Expected: PASS (menu button exists)

**Step 3: Add "Open Project" menu item to titlebar**

```typescript
// Modify frontend/components/titlebar.tsx - add import
import { FolderOpen } from 'lucide-react'
import { useFileTreeStore } from '@/stores/file-tree'

// Modify the component to add click handler
export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const { toggleSidebar } = useFileTreeStore()

  // ... existing useEffect ...

  return (
    <div
      data-tauri-drag-region
      className="relative flex h-10 shrink-0 select-none items-center justify-between px-3"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex h-8 w-10 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Menu"
          >
            <Ellipsis className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          <DropdownMenuItem onClick={toggleSidebar}>
            <FolderOpen className="h-3.5 w-3.5" />
            Open Project
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Info className="h-3.5 w-3.5" />
            Sobre o Forja
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ... rest of component unchanged ... */}
    </div>
  );
}
```

**Step 4: Run all tests**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm vitest run
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/components/titlebar.tsx frontend/components/titlebar.test.tsx
git commit -m "feat: add Open Project menu item to titlebar"
```

---

## Task 7: Integrate Sidebar into App Layout

**Files:**

- Modify: `frontend/App.tsx`

**Step 1: Import sidebar component and add to layout**

```typescript
// Modify frontend/App.tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Anvil } from "lucide-react";
import { Titlebar } from "./components/titlebar";
import { Statusbar } from "./components/statusbar";
import { FileTreeSidebar } from "./components/file-tree-sidebar";
import { useFileTreeStore } from "./stores/file-tree";

function App() {
  const [greeting, setGreeting] = useState("");
  const [name, setName] = useState("");
  const { isOpen, setCurrentPath, setTree } = useFileTreeStore();

  async function greet() {
    const response = await invoke<string>("greet", { name });
    setGreeting(response);
  }

  // Load directory tree when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadProjectDirectory();
    }
  }, [isOpen]);

  async function loadProjectDirectory() {
    try {
      // Open directory picker
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Directory',
      });

      if (selected && typeof selected === 'string') {
        setCurrentPath(selected);

        // Load directory tree
        const tree = await invoke<any>('read_directory_tree_command', {
          path: selected,
          maxDepth: 3,
        });

        setTree(tree);
      }
    } catch (error) {
      console.error('Failed to load project directory:', error);
    }
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <Titlebar />

      <div className="flex flex-1 overflow-hidden">
        <FileTreeSidebar />

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <Anvil
              className="h-16 w-16 text-brand"
              strokeWidth={1.5}
            />
            <h1 className="text-3xl font-bold text-zinc-50">Forja</h1>
            <p className="text-sm text-zinc-400">
              A dedicated desktop client for Claude Code
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") greet();
              }}
              placeholder="Enter a name..."
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
            <button
              onClick={greet}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Greet
            </button>
          </div>

          {greeting && (
            <p className="text-lg text-zinc-300">{greeting}</p>
          )}

          <div className="flex flex-col items-center gap-1 text-xs text-zinc-600">
            <p>
              <span className="font-sans">Geist Sans (UI font)</span>
              {" / "}
              <span className="font-mono">JetBrains Mono (code font)</span>
            </p>
          </div>
        </div>
      </div>

      <Statusbar />
    </div>
  );
}

export default App;
```

**Step 2: Add Tauri dialog plugin to dependencies**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm add @tauri-apps/plugin-dialog
```

**Step 3: Register dialog plugin in Tauri config**

```json
// Modify backend/tauri.conf.json - add to plugins array
{
  "plugins": {
    "dialog": {
      "all": true
    }
  }
}
```

**Step 4: Test the app in dev mode**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm tauri dev
```

Expected: App launches, clicking "Open Project" menu opens sidebar and directory picker

**Step 5: Commit**

```bash
git add frontend/App.tsx backend/tauri.conf.json package.json pnpm-lock.yaml
git commit -m "feat: integrate file tree sidebar into app layout with directory picker"
```

---

## Task 8: Add Keyboard Shortcut for Sidebar Toggle

**Files:**

- Modify: `frontend/App.tsx`
- Create: `frontend/hooks/use-keyboard-shortcut.ts`

**Step 1: Create keyboard shortcut hook**

```typescript
// Create: frontend/hooks/use-keyboard-shortcut.ts
import { useEffect } from 'react'

interface KeyboardShortcutOptions {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: () => void
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const {
        key,
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
      } = options

      if (
        event.key === key &&
        event.ctrlKey === ctrlKey &&
        event.metaKey === metaKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey
      ) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [options, callback])
}
```

**Step 2: Add keyboard shortcut to App.tsx**

```typescript
// Add to frontend/App.tsx imports
import { useKeyboardShortcut } from './hooks/use-keyboard-shortcut'

// Add inside App() component
useKeyboardShortcut(
  { key: 'b', metaKey: true }, // Cmd+B on macOS
  () => {
    const { toggleSidebar } = useFileTreeStore.getState()
    toggleSidebar()
  }
)
```

**Step 3: Test keyboard shortcut**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm tauri dev
```

Expected: Pressing Cmd+B (macOS) or Ctrl+B (Linux) toggles sidebar

**Step 4: Commit**

```bash
git add frontend/App.tsx frontend/hooks/use-keyboard-shortcut.ts
git commit -m "feat: add Cmd+B keyboard shortcut to toggle sidebar"
```

---

## Task 9: Add Visual Polish and Animations

**Files:**

- Modify: `frontend/components/file-tree-sidebar.tsx`
- Modify: `frontend/styles/globals.css` (if needed for custom scrollbar)

**Step 1: Add slide-in animation to sidebar**

```typescript
// Modify frontend/components/file-tree-sidebar.tsx - update root div
<div
  data-testid="file-tree-sidebar"
  className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col animate-in slide-in-from-left duration-150"
>
```

**Step 2: Add custom scrollbar styles**

```css
/* Add to frontend/styles/globals.css or create new file */

/* Custom scrollbar for file tree */
.file-tree-scroll::-webkit-scrollbar {
  width: 8px;
}

.file-tree-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.file-tree-scroll::-webkit-scrollbar-thumb {
  background: theme('colors.zinc.700');
  border-radius: 4px;
}

.file-tree-scroll::-webkit-scrollbar-thumb:hover {
  background: theme('colors.zinc.600');
}
```

**Step 3: Apply scrollbar class to file tree container**

```typescript
// Modify frontend/components/file-tree-sidebar.tsx - file tree div
<div className="flex-1 overflow-y-auto file-tree-scroll">
```

**Step 4: Test animations and scrollbar**

```bash
cd /home/nandomoreira/development/projects/forja-terminal && pnpm tauri dev
```

Expected: Sidebar slides in smoothly, scrollbar matches dark theme

**Step 5: Commit**

```bash
git add frontend/components/file-tree-sidebar.tsx frontend/styles/globals.css
git commit -m "feat: add slide-in animation and custom scrollbar to sidebar"
```

---

## Task 10: Update Documentation

**Files:**

- Modify: `CLAUDE.md`
- Modify: `docs/MVP-SCOPE.md` (if exists)

**Step 1: Update CLAUDE.md with sidebar feature**

```markdown
## MVP Features (P0)

1. **Project Selector** - Recent projects list + native file picker, persisted in TOML config
2. **Claude Code Pane** - PTY connected to `claude` process with input/output
3. **Markdown Rendering** - CommonMark output rendered in real-time (headers, lists, bold, inline code)
4. **Code Blocks** - Syntax highlight via Shiki, language auto-detection
5. **Session State** - Visual indicator for "thinking" vs "ready" states
6. **Git Header** - Current branch + modified file count, auto-updates via file watcher
7. **Error Handling** - Graceful fallback when `claude` CLI is not installed
8. **File Tree Sidebar** - Collapsible sidebar with project directory structure, file type icons, and toolbar actions (NEW)
```

**Step 2: Update App Layout diagram in CLAUDE.md**

```markdown
### App Layout

```

┌─────────────────────────────────────────────────┐
│  Git Header (32px) — branch + modified files    │
├──────┬──────────────────┬──────────────────────┤
│      │                  │                      │
│ File │ Claude Code Pane │  Markdown Preview    │
│ Tree │ (xterm.js)       │  (React renderer)    │
│      │  ~60% width      │  ~40% width          │
│      │                  │                      │
└──────┴──────────────────┴──────────────────────┘
│  Status Bar (24px) — state, last activity       │
└─────────────────────────────────────────────────┘

```
```

**Step 3: Commit documentation updates**

```bash
git add CLAUDE.md docs/MVP-SCOPE.md
git commit -m "docs: update CLAUDE.md with file tree sidebar feature"
```

---

## Definition of Done

- [ ] Rust backend command `read_directory_tree_command` implemented and tested
- [ ] Frontend Zustand store for sidebar state created with tests
- [ ] File icon component with extension mapping implemented
- [ ] File tree sidebar component with collapsible nodes working
- [ ] "Open Project" menu item in titlebar opens sidebar
- [ ] Directory picker integration via Tauri dialog plugin
- [ ] Keyboard shortcut (Cmd+B / Ctrl+B) toggles sidebar
- [ ] Slide-in animation and custom scrollbar applied
- [ ] All tests passing (`pnpm vitest run`)
- [ ] App runs in dev mode without errors (`pnpm tauri dev`)
- [ ] Documentation updated in CLAUDE.md

---

## Notes

- **Skipped files/dirs:** `.git`, `node_modules`, `target`, and hidden files (starting with `.`) are excluded from tree
- **Default depth:** 3 levels to prevent performance issues on large projects
- **Future enhancements (out of scope for this plan):**
  - File watching for auto-refresh on file system changes
  - File operations (create, delete, rename)
  - Search/filter files in sidebar
  - Context menu on right-click
  - Drag-and-drop support
  - Integration with Claude Code to open files in terminal

---

**Plan created:** 2026-02-22
**Estimated time:** 4-6 hours (10 tasks)
**Tech stack:** React 19, TypeScript, Tauri 2, Zustand, Lucide React, shadcn/ui
