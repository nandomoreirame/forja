# File Preview Pane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use implement-plan to implement this plan task-by-task.

**Goal:** Add a file preview pane that displays file contents with syntax highlighting (using Shiki + Catppuccin Mocha theme) when users click on files in the file tree sidebar.

**Architecture:** Split pane layout with file tree (left), terminal (center), and file preview (right). Preview pane shows syntax-highlighted code for supported file types, formatted markdown for .md files, and raw text for others. Uses Shiki for syntax highlighting with catppuccin-mocha theme. Backend provides file reading via Tauri command.

**Tech Stack:** React 19, TypeScript, Zustand (state), Shiki (syntax highlighting), react-markdown (markdown rendering), Tauri commands (file I/O)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Shiki and react-markdown packages**

```bash
cd /home/nandomoreira/development/projects/forja-terminal
pnpm add shiki react-markdown remark-gfm
```

Expected: Packages installed successfully

**Step 2: Verify installation**

```bash
pnpm list shiki react-markdown remark-gfm
```

Expected: All three packages appear in the dependency tree

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add shiki and react-markdown for file preview"
```

---

## Task 2: Backend - File Reading Command

**Files:**
- Modify: `backend/src/lib.rs`

**Step 1: Write test for read_file_command**

Create: `backend/src/lib.rs` (add test module)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_read_file_command() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("test.txt");
        fs::write(&file_path, "Hello, World!").unwrap();

        let result = read_file_command(file_path.to_str().unwrap().to_string(), Some(1024 * 1024));
        assert!(result.is_ok());
        assert_eq!(result.unwrap().content, "Hello, World!");
    }

    #[test]
    fn test_read_file_command_size_limit() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("large.txt");
        let large_content = "x".repeat(2000);
        fs::write(&file_path, &large_content).unwrap();

        let result = read_file_command(file_path.to_str().unwrap().to_string(), Some(1000));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("exceeds size limit"));
    }
}
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && cargo test test_read_file_command -- --nocapture
```

Expected: FAIL with "cannot find function `read_file_command`"

**Step 3: Implement read_file_command**

Add to `backend/src/lib.rs` before the tests module:

```rust
use std::fs;
use std::path::Path;

#[derive(serde::Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub size: u64,
}

#[tauri::command]
pub fn read_file_command(path: String, max_size: Option<u64>) -> Result<FileContent, String> {
    let file_path = Path::new(&path);

    // Check file exists
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Check if it's a file (not directory)
    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    // Get file size
    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size = metadata.len();

    // Check size limit (default 10MB)
    let limit = max_size.unwrap_or(10 * 1024 * 1024);
    if size > limit {
        return Err(format!("File size ({} bytes) exceeds size limit ({} bytes)", size, limit));
    }

    // Read file content
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(FileContent {
        path: path.clone(),
        content,
        size,
    })
}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && cargo test test_read_file_command -- --nocapture
```

Expected: PASS (2 tests)

**Step 5: Register command in Tauri app**

Modify `backend/src/lib.rs` in the `run()` function to add the command:

```rust
// Find the tauri::Builder::default() chain and add read_file_command
.invoke_handler(tauri::generate_handler![
    read_directory_tree_command,
    get_system_metrics,
    spawn_pty,
    write_to_pty,
    close_pty,
    read_file_command,  // <-- ADD THIS LINE
])
```

**Step 6: Build backend to verify compilation**

```bash
cd backend && cargo build
```

Expected: Successful compilation with no errors

**Step 7: Commit**

```bash
git add backend/src/lib.rs
git commit -m "feat(backend): add read_file_command for file preview"
```

---

## Task 3: Frontend - File Preview Store (Zustand)

**Files:**
- Create: `frontend/stores/file-preview.ts`
- Modify: `frontend/stores/file-tree.ts`

**Step 1: Write test for file preview store**

Create: `frontend/stores/__tests__/file-preview.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFilePreviewStore } from '../file-preview';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('useFilePreviewStore', () => {
  beforeEach(() => {
    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it('should toggle preview pane', () => {
    const { togglePreview } = useFilePreviewStore.getState();

    expect(useFilePreviewStore.getState().isOpen).toBe(false);
    togglePreview();
    expect(useFilePreviewStore.getState().isOpen).toBe(true);
    togglePreview();
    expect(useFilePreviewStore.getState().isOpen).toBe(false);
  });

  it('should set loading state when loading file', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as any).mockResolvedValue({ path: '/test.ts', content: 'code', size: 4 });

    const { loadFile } = useFilePreviewStore.getState();

    const promise = loadFile('/test.ts');
    expect(useFilePreviewStore.getState().isLoading).toBe(true);

    await promise;
    expect(useFilePreviewStore.getState().isLoading).toBe(false);
    expect(useFilePreviewStore.getState().content).not.toBeNull();
  });

  it('should close preview pane', () => {
    useFilePreviewStore.setState({ isOpen: true, currentFile: '/test.ts' });

    const { closePreview } = useFilePreviewStore.getState();
    closePreview();

    expect(useFilePreviewStore.getState().isOpen).toBe(false);
    expect(useFilePreviewStore.getState().currentFile).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run frontend/stores/__tests__/file-preview.test.ts
```

Expected: FAIL with "Cannot find module '../file-preview'"

**Step 3: Create file preview store**

Create: `frontend/stores/file-preview.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

interface FilePreviewState {
  isOpen: boolean;
  currentFile: string | null;
  content: FileContent | null;
  isLoading: boolean;
  error: string | null;

  togglePreview: () => void;
  openPreview: () => void;
  closePreview: () => void;
  loadFile: (path: string) => Promise<void>;
  clearError: () => void;
}

export const useFilePreviewStore = create<FilePreviewState>((set, get) => ({
  isOpen: false,
  currentFile: null,
  content: null,
  isLoading: false,
  error: null,

  togglePreview: () => set((state) => ({ isOpen: !state.isOpen })),

  openPreview: () => set({ isOpen: true }),

  closePreview: () => set({
    isOpen: false,
    currentFile: null,
    content: null,
    error: null
  }),

  loadFile: async (path: string) => {
    set({ isLoading: true, error: null, currentFile: path });
    try {
      const result = await invoke<FileContent>('read_file_command', {
        path,
        maxSize: 10 * 1024 * 1024, // 10MB limit
      });
      set({
        content: result,
        isLoading: false,
        isOpen: true,
      });
    } catch (err) {
      set({
        error: String(err),
        isLoading: false,
        content: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run frontend/stores/__tests__/file-preview.test.ts
```

Expected: PASS (3 tests)

**Step 5: Update file-tree store to trigger preview on file click**

Modify: `frontend/stores/file-tree.ts`

```typescript
// Add import at top
import { useFilePreviewStore } from './file-preview';

// Add new action to FileTreeState interface
interface FileTreeState {
  // ... existing fields
  selectFile: (path: string) => void;  // <-- ADD THIS
}

// Add implementation in create() call
export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  // ... existing state and methods

  selectFile: (path: string) => {
    const { loadFile } = useFilePreviewStore.getState();
    loadFile(path);
  },
}));
```

**Step 6: Write test for selectFile action**

Create: `frontend/stores/__tests__/file-tree.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFileTreeStore } from '../file-tree';
import { useFilePreviewStore } from '../file-preview';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('useFileTreeStore', () => {
  it('should load file in preview when selectFile is called', () => {
    const loadFileSpy = vi.spyOn(useFilePreviewStore.getState(), 'loadFile');

    const { selectFile } = useFileTreeStore.getState();
    selectFile('/path/to/test.ts');

    expect(loadFileSpy).toHaveBeenCalledWith('/path/to/test.ts');
  });
});
```

**Step 7: Run test to verify it passes**

```bash
pnpm vitest run frontend/stores/__tests__/file-tree.test.ts -t "should load file"
```

Expected: PASS

**Step 8: Commit**

```bash
git add frontend/stores/file-preview.ts frontend/stores/__tests__/ frontend/stores/file-tree.ts
git commit -m "feat(frontend): add file preview store with file selection"
```

---

## Task 4: Shiki Syntax Highlighter Hook

**Files:**
- Create: `frontend/hooks/use-syntax-highlighter.ts`

**Step 1: Write test for syntax highlighter hook**

Create: `frontend/hooks/__tests__/use-syntax-highlighter.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSyntaxHighlighter } from '../use-syntax-highlighter';

describe('useSyntaxHighlighter', () => {
  it('should initialize highlighter', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it('should highlight code with detected language', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const code = 'const x = 42;';
    const html = await result.current.highlight(code, 'typescript');

    expect(html).toContain('const');
    expect(html).toContain('x');
  });

  it('should detect language from file extension', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const lang = result.current.detectLanguage('test.tsx');
    expect(lang).toBe('tsx');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run frontend/hooks/__tests__/use-syntax-highlighter.test.tsx
```

Expected: FAIL with "Cannot find module '../use-syntax-highlighter'"

**Step 3: Implement syntax highlighter hook**

Create: `frontend/hooks/use-syntax-highlighter.ts`

```typescript
import { useEffect, useState } from 'react';
import { createHighlighter, Highlighter } from 'shiki';

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  sh: 'bash',
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',
  md: 'markdown',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  sql: 'sql',
  graphql: 'graphql',
  vue: 'vue',
  svelte: 'svelte',
  dockerfile: 'dockerfile',
};

export function useSyntaxHighlighter() {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    createHighlighter({
      themes: ['catppuccin-mocha'],
      langs: Object.values(LANGUAGE_MAP),
    }).then((hl) => {
      setHighlighter(hl);
      setIsReady(true);
    });
  }, []);

  const detectLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? LANGUAGE_MAP[ext] || 'plaintext' : 'plaintext';
  };

  const highlight = async (code: string, language: string): Promise<string> => {
    if (!highlighter || !isReady) {
      return code;
    }

    try {
      return highlighter.codeToHtml(code, {
        lang: language,
        theme: 'catppuccin-mocha',
      });
    } catch {
      // Fallback to plaintext if language not supported
      return highlighter.codeToHtml(code, {
        lang: 'plaintext',
        theme: 'catppuccin-mocha',
      });
    }
  };

  return {
    isReady,
    highlight,
    detectLanguage,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run frontend/hooks/__tests__/use-syntax-highlighter.test.tsx
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/hooks/use-syntax-highlighter.ts frontend/hooks/__tests__/use-syntax-highlighter.test.tsx
git commit -m "feat(frontend): add syntax highlighter hook with Shiki"
```

---

## Task 5: File Preview Component

**Files:**
- Create: `frontend/components/file-preview-pane.tsx`
- Create: `frontend/components/code-viewer.tsx`

**Step 1: Write test for FilePreviewPane component**

Create: `frontend/components/__tests__/file-preview-pane.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilePreviewPane } from '../file-preview-pane';
import { useFilePreviewStore } from '@/stores/file-preview';

describe('FilePreviewPane', () => {
  beforeEach(() => {
    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(<FilePreviewPane />);
    expect(container.firstChild).toBeNull();
  });

  it('should show loading state', () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: true,
      currentFile: '/test.ts',
    });

    render(<FilePreviewPane />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show error message', () => {
    useFilePreviewStore.setState({
      isOpen: true,
      error: 'File too large',
      currentFile: '/test.ts',
    });

    render(<FilePreviewPane />);
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });

  it('should render content when loaded', () => {
    useFilePreviewStore.setState({
      isOpen: true,
      content: {
        path: '/test.ts',
        content: 'const x = 42;',
        size: 13,
      },
      currentFile: '/test.ts',
      isLoading: false,
      error: null,
    });

    render(<FilePreviewPane />);
    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run frontend/components/__tests__/file-preview-pane.test.tsx
```

Expected: FAIL with "Cannot find module '../file-preview-pane'"

**Step 3: Create CodeViewer component**

Create: `frontend/components/code-viewer.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useSyntaxHighlighter } from '@/hooks/use-syntax-highlighter';

interface CodeViewerProps {
  code: string;
  filename: string;
}

export function CodeViewer({ code, filename }: CodeViewerProps) {
  const { isReady, highlight, detectLanguage } = useSyntaxHighlighter();
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (!isReady) return;

    const language = detectLanguage(filename);
    highlight(code, language).then(setHtml);
  }, [code, filename, isReady, highlight, detectLanguage]);

  if (!isReady || !html) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="code-viewer overflow-auto p-4 text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: '13px',
        lineHeight: '1.5',
      }}
    />
  );
}
```

**Step 4: Create FilePreviewPane component**

Create: `frontend/components/file-preview-pane.tsx`

```typescript
import { X, FileCode, AlertCircle } from 'lucide-react';
import { useFilePreviewStore } from '@/stores/file-preview';
import { CodeViewer } from './code-viewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePreviewPane() {
  const { isOpen, content, isLoading, error, currentFile, closePreview } =
    useFilePreviewStore();

  if (!isOpen) return null;

  const filename = currentFile?.split('/').pop() || 'Unknown';
  const isMarkdown = filename.endsWith('.md');

  return (
    <div
      className="flex h-full w-96 shrink-0 flex-col border-l border-ctp-surface0 bg-ctp-base"
      data-testid="file-preview-pane"
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileCode className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-ctp-text">
            {filename}
          </span>
        </div>
        <button
          onClick={closePreview}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-sm text-ctp-overlay1">Loading file...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-error" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-ctp-text">Failed to load file</p>
                <p className="mt-1 text-xs text-ctp-overlay1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {content && !isLoading && !error && (
          <>
            {isMarkdown ? (
              <div className="markdown prose prose-invert max-w-none p-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.content}
                </ReactMarkdown>
              </div>
            ) : (
              <CodeViewer code={content.content} filename={filename} />
            )}

            {/* Footer with file info */}
            <div className="border-t border-ctp-surface0 px-3 py-2">
              <p className="text-xs text-ctp-overlay1">
                {formatFileSize(content.size)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Run test to verify it passes**

```bash
pnpm vitest run frontend/components/__tests__/file-preview-pane.test.tsx
```

Expected: PASS (4 tests)

**Step 6: Commit**

```bash
git add frontend/components/file-preview-pane.tsx frontend/components/code-viewer.tsx frontend/components/__tests__/file-preview-pane.test.tsx
git commit -m "feat(frontend): add file preview pane with syntax highlighting"
```

---

## Task 6: Update File Tree to Trigger Preview

**Files:**
- Modify: `frontend/components/file-tree-node.tsx`

**Step 1: Write test for file click behavior**

Create: `frontend/components/__tests__/file-tree-node.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileTreeNode } from '../file-tree-node';
import { useFileTreeStore, type FileNode } from '@/stores/file-tree';

describe('FileTreeNode', () => {
  it('should call selectFile when file is clicked', async () => {
    const user = userEvent.setup();
    const selectFileSpy = vi.spyOn(useFileTreeStore.getState(), 'selectFile');

    const fileNode: FileNode = {
      name: 'test.ts',
      path: '/project/test.ts',
      isDir: false,
      extension: 'ts',
    };

    render(<FileTreeNode node={fileNode} depth={0} />);

    const button = screen.getByRole('button', { name: /test\.ts/i });
    await user.click(button);

    expect(selectFileSpy).toHaveBeenCalledWith('/project/test.ts');
  });

  it('should toggle expanded when directory is clicked', async () => {
    const user = userEvent.setup();
    const toggleExpandedSpy = vi.spyOn(useFileTreeStore.getState(), 'toggleExpanded');

    const dirNode: FileNode = {
      name: 'src',
      path: '/project/src',
      isDir: true,
      children: [],
    };

    render(<FileTreeNode node={dirNode} depth={0} />);

    const button = screen.getByRole('button', { name: /src/i });
    await user.click(button);

    expect(toggleExpandedSpy).toHaveBeenCalledWith('/project/src');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run frontend/components/__tests__/file-tree-node.test.tsx
```

Expected: FAIL (selectFile not called)

**Step 3: Update FileTreeNode to handle file clicks**

Modify: `frontend/components/file-tree-node.tsx`

```typescript
export function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const { isExpanded, toggleExpanded, selectFile } = useFileTreeStore();  // <-- ADD selectFile
  const expanded = isExpanded(node.path);

  const handleClick = () => {
    if (node.isDir) {
      toggleExpanded(node.path);
    } else {
      // Handle file click
      selectFile(node.path);  // <-- ADD THIS
    }
  };

  // ... rest of component unchanged
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run frontend/components/__tests__/file-tree-node.test.tsx
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add frontend/components/file-tree-node.tsx frontend/components/__tests__/file-tree-node.test.tsx
git commit -m "feat(frontend): add file preview on file click in tree"
```

---

## Task 7: Integrate Preview Pane into App Layout

**Files:**
- Modify: `frontend/App.tsx`

**Step 1: Write test for App with preview pane**

Modify: `frontend/App.tsx` (we'll add integration test after implementation)

Note: This step focuses on visual integration, integration tests will be in Task 8.

**Step 2: Import FilePreviewPane in App.tsx**

Add import at top of `frontend/App.tsx`:

```typescript
import { FilePreviewPane } from "./components/file-preview-pane";
```

**Step 3: Add FilePreviewPane to layout**

Modify the main content section in `frontend/App.tsx`:

Find this section (around line 201-210):

```typescript
<div className="flex flex-1 overflow-hidden">
  <FileTreeSidebar />
  <div className="flex flex-1 flex-col overflow-hidden">
    {!hasProject ? (
      <EmptyState />
    ) : tabs.length === 0 ? (
      <NoSessionsState onNewTab={createNewTab} />
    ) : (
      <TerminalPane />
    )}
  </div>
</div>
```

Replace with:

```typescript
<div className="flex flex-1 overflow-hidden">
  <FileTreeSidebar />
  <div className="flex flex-1 flex-col overflow-hidden">
    {!hasProject ? (
      <EmptyState />
    ) : tabs.length === 0 ? (
      <NoSessionsState onNewTab={createNewTab} />
    ) : (
      <TerminalPane />
    )}
  </div>
  <FilePreviewPane />
</div>
```

**Step 4: Add keyboard shortcut for preview pane toggle**

Add to keyboard shortcuts handler in `frontend/App.tsx` (around line 150-185):

```typescript
// Add inside the handler function, after Cmd+W
if (mod && event.key === "p") {
  event.preventDefault();
  const { togglePreview } = useFilePreviewStore.getState();
  togglePreview();
}
```

And import at the top:

```typescript
import { useFilePreviewStore } from "./stores/file-preview";
```

**Step 5: Test manually in dev mode**

```bash
pnpm dev
```

Expected: App runs, file tree visible, clicking file opens preview pane on right

**Step 6: Commit**

```bash
git add frontend/App.tsx
git commit -m "feat(frontend): integrate file preview pane in app layout"
```

---

## Task 8: Add Markdown Prose Styles

**Files:**
- Create: `frontend/styles/markdown.css`
- Modify: `frontend/main.tsx` (to import styles)

**Step 1: Create markdown prose styles**

Create: `frontend/styles/markdown.css`

```css
/* Markdown prose styles for FilePreviewPane */
.markdown.prose {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #cdd6f4; /* ctp-text */
}

/* Headings */
.markdown.prose h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #cdd6f4;
  border-bottom: 1px solid #313244;
  padding-bottom: 0.5rem;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.markdown.prose h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #cdd6f4;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown.prose h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #cdd6f4;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

/* Paragraphs */
.markdown.prose p {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #bac2de; /* ctp-subtext1 */
  margin-bottom: 0.75rem;
}

/* Lists */
.markdown.prose ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown.prose ol {
  list-style: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown.prose li {
  color: #bac2de;
  margin-bottom: 0.25rem;
}

/* Inline code */
.markdown.prose code:not(pre code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  background: #313244; /* ctp-surface0 */
  color: #cba6f7; /* brand/mauve */
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

/* Code blocks */
.markdown.prose pre {
  background: #11111b; /* ctp-crust */
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.markdown.prose pre code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  background: transparent;
  padding: 0;
}

/* Blockquote */
.markdown.prose blockquote {
  border-left: 3px solid #cba6f7; /* brand */
  padding-left: 1rem;
  margin: 1rem 0;
  color: #6c7086; /* ctp-overlay0 */
  font-style: italic;
}

/* Links */
.markdown.prose a {
  color: #89b4fa; /* ctp-blue */
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown.prose a:hover {
  color: #b4befe; /* ctp-lavender */
}

/* Tables */
.markdown.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.markdown.prose th {
  background: #313244; /* ctp-surface0 */
  color: #cdd6f4;
  font-weight: 600;
  text-align: left;
}

.markdown.prose td,
.markdown.prose th {
  border: 1px solid #313244;
  padding: 0.5rem 0.75rem;
}

.markdown.prose tr:nth-child(even) td {
  background: #181825; /* ctp-mantle */
}

/* Horizontal rule */
.markdown.prose hr {
  border: none;
  border-top: 1px solid #313244;
  margin: 1.5rem 0;
}

/* Images */
.markdown.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1rem 0;
}
```

**Step 2: Import markdown styles in main.tsx**

Modify: `frontend/main.tsx`

Add import:

```typescript
import "./styles/markdown.css";
```

**Step 3: Test markdown rendering**

```bash
pnpm dev
```

Create a test markdown file in the project and click on it to preview.

Expected: Markdown renders with proper Catppuccin Mocha styling

**Step 4: Commit**

```bash
git add frontend/styles/markdown.css frontend/main.tsx
git commit -m "feat(frontend): add markdown prose styles for preview"
```

---

## Task 9: Integration Tests

**Files:**
- Create: `tests/integration/file-preview.test.tsx`

**Step 1: Write integration test**

Create: `tests/integration/file-preview.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { useFileTreeStore } from '@/stores/file-tree';
import { useFilePreviewStore } from '@/stores/file-preview';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe('File Preview Integration', () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: true,
      currentPath: '/test/project',
      tree: {
        root: {
          name: 'project',
          path: '/test/project',
          isDir: true,
          children: [
            {
              name: 'test.ts',
              path: '/test/project/test.ts',
              isDir: false,
              extension: 'ts',
            },
          ],
        },
      },
      expandedPaths: new Set(['/test/project']),
    });

    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it('should open file preview when file is clicked', async () => {
    const user = userEvent.setup();
    const { invoke } = await import('@tauri-apps/api/core');

    (invoke as any).mockResolvedValue({
      path: '/test/project/test.ts',
      content: 'const x = 42;',
      size: 13,
    });

    render(<App />);

    // Find and click the file
    const fileButton = screen.getByText('test.ts');
    await user.click(fileButton);

    // Wait for preview pane to open
    await waitFor(() => {
      expect(screen.getByTestId('file-preview-pane')).toBeInTheDocument();
    });

    // Check that content is loading
    expect(screen.getByText(/loading file/i)).toBeInTheDocument();

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByText(/loading file/i)).not.toBeInTheDocument();
    });
  });

  it('should close preview pane with close button', async () => {
    const user = userEvent.setup();

    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: '/test/project/test.ts',
      content: {
        path: '/test/project/test.ts',
        content: 'const x = 42;',
        size: 13,
      },
      isLoading: false,
      error: null,
    });

    render(<App />);

    const closeButton = screen.getByLabelText(/close preview/i);
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('file-preview-pane')).not.toBeInTheDocument();
    });
  });
});
```

**Step 2: Run integration tests**

```bash
pnpm vitest run tests/integration/file-preview.test.tsx
```

Expected: PASS (2 tests)

**Step 3: Run all tests to verify nothing broke**

```bash
pnpm vitest run
```

Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/integration/file-preview.test.tsx
git commit -m "test(frontend): add integration tests for file preview"
```

---

## Task 10: Documentation and Keyboard Shortcuts

**Files:**
- Modify: `frontend/components/keyboard-shortcuts-dialog.tsx`
- Modify: `docs/DESIGN-GUIDELINES.md`

**Step 1: Add file preview shortcuts to keyboard shortcuts dialog**

Modify: `frontend/components/keyboard-shortcuts-dialog.tsx`

Find the shortcuts list and add:

```typescript
// Add after the existing shortcuts
{
  keys: [mod, 'P'],
  description: 'Toggle file preview pane',
},
```

**Step 2: Update design guidelines**

Modify: `docs/DESIGN-GUIDELINES.md`

Add new section after "App Layout" (around line 430):

```markdown
### File Preview Pane

**Purpose:** Display file contents with syntax highlighting when files are clicked in the file tree.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Git Header (32px)                                           │
├──────┬──────────────────────────┬────────────────────────────┤
│ File │  Terminal Pane           │  File Preview Pane         │
│ Tree │  (xterm.js)              │  (syntax highlighted)      │
│ 256px│  ~60%                    │  384px                     │
└──────┴──────────────────────────┴────────────────────────────┘
│  Status Bar (24px)                                           │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

- Syntax highlighting via Shiki (catppuccin-mocha theme)
- Markdown rendering with react-markdown
- File size limit: 10MB
- Keyboard shortcut: Cmd/Ctrl+P to toggle

**Styling:**

- Width: 384px (w-96)
- Background: `bg-ctp-base`
- Border: `border-l border-ctp-surface0`
- Header: same as other pane headers (40px, semibold)
```

**Step 3: Commit**

```bash
git add frontend/components/keyboard-shortcuts-dialog.tsx docs/DESIGN-GUIDELINES.md
git commit -m "docs: add file preview keyboard shortcut and design guidelines"
```

---

## Task 11: Final Manual Testing

**Step 1: Test with various file types**

```bash
pnpm dev
```

Test cases:
1. Click on `.ts` file → syntax highlight with TypeScript
2. Click on `.md` file → rendered markdown with styles
3. Click on `.json` file → syntax highlight with JSON
4. Click on `.rs` file → syntax highlight with Rust
5. Try large file (> 10MB) → error message displayed
6. Toggle preview with Cmd/Ctrl+P → pane opens/closes

**Step 2: Test keyboard shortcuts**

- Cmd/Ctrl+P: Toggle preview pane
- Click file: Opens preview
- Click X button: Closes preview

**Step 3: Verify styling**

- Catppuccin Mocha colors applied correctly
- Markdown prose styles match design guidelines
- Code font is JetBrains Mono
- Loading states appear correctly
- Error states are clear and helpful

**Step 4: Document any issues found**

Create GitHub issues for any bugs discovered during testing.

---

## Success Criteria

- [ ] Clicking files in file tree opens preview pane
- [ ] Syntax highlighting works for common languages (TypeScript, JavaScript, Python, Rust, etc.)
- [ ] Markdown files render with formatted output
- [ ] Catppuccin Mocha theme applied to all syntax highlighting
- [ ] 10MB file size limit enforced with clear error
- [ ] Cmd/Ctrl+P toggles preview pane
- [ ] Loading states are smooth and clear
- [ ] All tests pass (unit + integration)
- [ ] Preview pane closes when X button clicked
- [ ] File size displayed in preview footer

---

## Notes

- Shiki is used for syntax highlighting with catppuccin-mocha theme
- react-markdown handles markdown rendering with remark-gfm for GitHub-flavored markdown
- File size limit set to 10MB to prevent loading huge files
- Preview pane is 384px wide (w-96 in Tailwind)
- Zustand manages preview state independently from file tree state
- Backend provides read_file_command for secure file reading
- Language detection based on file extension via LANGUAGE_MAP
