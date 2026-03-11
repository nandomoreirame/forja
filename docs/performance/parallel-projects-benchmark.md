# Parallel Projects Performance Benchmark

## Overview

This document records the performance optimizations applied to Forja as part of the
Electron Performance Scalability plan (2026-03-11). The goal was to reduce RAM/CPU
cost when running multiple projects and terminals in parallel, without changing
the functional design.

## Optimizations Applied

### 1. Monaco Lazy Loading (Task 2)

- Monaco editors loaded via `React.lazy()` + `Suspense` boundaries
- Markdown and image previews never load Monaco
- Diff editor only mounts when `selectedDiff` exists
- **Impact:** `vendor-monaco` (3.7MB / 975KB gzip) is a separate chunk, not in critical path

### 2. Hidden Terminal Rendering Cost (Task 3)

- WebGL addon disposed immediately on hide (previously 30s delay)
- Guard prevents `fit()` on hidden terminals
- PTY session remains alive in backend
- **Impact:** Hidden tabs release GPU resources instantly

### 3. Selective File Refresh (Task 4)

- `files:changed` payload now includes `changedPaths[]` (relative paths)
- File cache invalidated per-file (not per-project)
- Tree refresh only triggers for the active project
- Preview reload skipped if current file is not in `changedPaths`
- **Impact:** Non-active projects no longer trigger tree reloads

### 4. Git Refresh Coalescing (Task 5)

- `GIT_DIFF_TTL_MS = 5000` added to git-diff store (matching git-status)
- `git:changed` listener debounced at 250ms to coalesce burst events
- `forceRefresh()` / `forceFetchStatuses()` used only on project switch
- **Impact:** Reduces overlapping IPC calls during rapid git activity

### 5. Demand-Driven Metrics (Task 6)

- Metrics loop starts only when a UI consumer mounts `useAppMetrics()`
- `registerMetricsSubscriber` / `unregisterMetricsSubscriber` IPC controls
- Loop stops when subscriber count reaches 0
- **Impact:** Zero CPU overhead from metrics when popover is not shown

### 6. Async Icon IO (Task 7)

- `detectProjectIcon()` and `readIconAsDataUrl()` migrated to `fs/promises`
- In-session cache (`Map<string, string | null>`) prevents repeated disk reads
- **Impact:** Main process no longer blocks on icon detection during project load

### 7. Browser Pane Lifecycle (Task 8)

- Webview lazy-mounted after first `requestAnimationFrame`
- Aggressive state cleanup on unmount
- `will-attach-webview` security guard enforces `nodeIntegration:false`
- **Impact:** Browser pane does not block initial render

## Build Analysis

| Chunk | Size | Gzip | Loading |
|-------|------|------|---------|
| `index.js` (main bundle) | 453 KB | 134 KB | Eager |
| `vendor-monaco` | 3,764 KB | 975 KB | Lazy |
| `vendor-xterm` | 449 KB | 116 KB | Eager |
| `vendor-markdown` | 157 KB | 47 KB | Eager |
| `vendor-ui` | 151 KB | 49 KB | Eager |
| `file-preview-pane` | 16 KB | 5 KB | Lazy |
| `command-palette` | 11 KB | 3 KB | Lazy |

Monaco (the heaviest dependency) is fully deferred from the critical path.

## Test Coverage

- **117 test files**, **1498 tests passing**
- Performance guardrail tests cover:
  - Metrics loop deduplication
  - Watcher debounce and event coalescing
  - Terminal resource disposal on hide
  - File preview selective reload
  - Git TTL caching per project
  - Subscriber-based metrics control
  - Async icon caching

## Benchmarking Guide

To manually benchmark, measure the following scenarios:

| Scenario | What to Measure |
|----------|-----------------|
| App idle (no project) | RSS, CPU% |
| 1 project open | RSS, CPU% |
| 3 projects open | RSS, CPU% (compare vs pre-optimization) |
| 6 terminals (3 visible, 3 hidden) | RSS, GPU memory |
| 1 diff view + 1 edit + browser pane | RSS, CPU% |
| Rapid file saves (10 files in 2s) | IPC call count, tree refresh count |
| Git operations (commit, checkout) | git:changed event count vs fetch count |

Use Forja's built-in Resource Usage popover or external tools (`htop`, Electron DevTools
Performance tab) to capture metrics.

## Known Limits

- Monaco chunk is still large (3.7MB). Consider Monaco tree-shaking or alternative
  editors for read-only preview in the future.
- `vendor-xterm` (449KB) is eagerly loaded because terminals are the primary UI.
- File tree still does a full reload for the active project on any file change.
  Incremental `mergeSubtree()` updates could further reduce this cost.
- Browser Pane still uses `<webview>` tag. Migration to `WebContentsView` is planned
  but deferred (see `docs/plans/browser-pane-migration-notes.md`).
