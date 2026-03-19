# Codebase Audit Report

**Project:** Forja Desktop Client
**Date:** 2026-03-15
**Branch:** feature/tiling-layout
**Version:** v1.6.2
**Auditor:** Claude Code

---

## Executive Summary

| Category | Status | Issues |
|----------|--------|--------|
| Security | WARN | 3 |
| Tests | OK | 0 |
| Lint/Format | WARN | 1 |
| Dependencies | WARN | 3 |
| Architecture (Tiling Layout) | WARN | 5 |
| Dead Code / Code Smells | WARN | 12 |
| Performance / Memory | CRITICAL | 21 |
| **Total** | | **45** |

---

## 1. Security

### 1.1 Electron ASAR Integrity Bypass (CVE-2025-55305)
- **Severity:** MODERATE (CVSS 6.1)
- **Package:** electron@32.3.3
- **Fix:** Upgrade to >=35.7.5
- **Note:** Only impacts apps with `embeddedAsarIntegrityValidation` + `onlyLoadAppFromAsar` fuses

### 1.2 node-tar Race Condition (CVE-2026-23950)
- **Severity:** HIGH (CVSS 8.8)
- **Package:** tar@6.2.1 (via @electron/rebuild)
- **Fix:** Upgrade to tar >=7.5.4

### 1.3 Form Submit Handler Without Explicit Validation
- **File:** `frontend/components/chat-panel.tsx:186`
- **Severity:** LOW (info)
- **Status:** Input is a simple text field, low risk

---

## 2. Lint & Formatter

### 2.1 No ESLint Configuration
- **Severity:** MEDIUM
- **Impact:** No automated code quality enforcement
- **Fix:** `pnpm add -D eslint @typescript-eslint/eslint-plugin eslint-config-prettier`

---

## 3. Dependencies

### 3.1 electron@32.3.3 - Outdated + Vulnerable
- Current: 32.3.3
- Patched: >=35.7.5
- **Action:** Plan major version upgrade

### 3.2 tar@6.2.1 - Vulnerable (transitive)
- Via: @electron/rebuild
- **Action:** Update @electron/rebuild to pull patched tar

### 3.3 pnpm audit: 3 advisories total
- 1 moderate (electron)
- 2 high (tar race condition + path traversal)

---

## 4. Architecture - Tiling Layout System (FOCUS AREA)

### 4.1 Redundant State: RightPanel Store vs TilingLayout (HIGH)

**Problem:** Two state systems track the same entity:
- `tiling-layout.ts` - FlexLayout model com blocks no dock RIGHT
- `right-panel.ts` - `isOpen`, `activeView`, per-project state

**Impact:** Sync bugs, confusing dual state management

**Files afetados:**
- `frontend/stores/right-panel.ts` (66 lines - redundant)
- `frontend/components/right-sidebar.tsx:143-147` (dual sync logic)
- `frontend/stores/agent-chat.ts:114` (cross-store coupling)

**Fix:** Deprecar `right-panel.ts` e migrar toda lógica para TilingLayout tabsets

### 4.2 No Inverse Sync Between Stores (MEDIUM)

**Problem:** When stores trigger layout changes, TilingLayout is not notified:
- `useTerminalTabsStore.removeTab()` does NOT remove TilingLayout block
- `useFilePreviewStore.setIsOpen(false)` does NOT remove block
- Only works when TilingLayout initiates the removal via `handleAction(DELETE_TAB)`

**Fix:** Add zustand subscriptions in TilingLayout store or establish action dispatch order

### 4.3 Marketplace Block State Inconsistency (MEDIUM)

**Problem:** `handleMarketplaceClick` em `right-sidebar.tsx:191-207` cria/remove block no TilingLayout mas NAO sincroniza `useRightPanelStore.isOpen`

**Fix:** Sync ambos stores ou remover right-panel store (ver 4.1)

### 4.4 Block ID Collision Risk (LOW)

**Problem:** Browser blocks usam `browser-${Date.now().toString(36)}-${counter}` - colisão possível se 2+ browsers abertos no mesmo ms

**Fix:** Usar crypto.randomUUID() ou incrementar counter com mais granularidade

### 4.5 Silent Error Handling on Layout Save (LOW)

**Problem:** `invoke("save_ui_preferences", ...)` em `tiling-layout.tsx:158` silently ignores errors via `.catch(() => {})`

**Fix:** Log errors, mostrar toast após falhas repetidas

---

## 5. Performance & Memory (CRITICAL)

### 5.1 CPU - Object.keys() O(n) Scan in git-status Selector (HIGH)

**File:** `frontend/stores/git-status.ts:117-124`

```typescript
// Fallback: linear scan
return Object.keys(map).some((filePath) => filePath.startsWith(prefix));
```

**Impact:** Called during tree rendering for EVERY directory node. In a 500-file project with 20 dirs = 10,000 string prefix checks per render.

**Fix:** Ensure `_changedDirsByProject` is always populated. Remove fallback O(n) path.

### 5.2 CPU - Zustand Store Spreads Creating New Objects (HIGH)

**Files:** `file-tree.ts:143-146`, `git-diff.ts:78-85`, `git-status.ts:42-53`, `terminal-tabs.ts:85,141`, `tiling-layout.ts:10`

```typescript
set((state) => ({
  trees: { ...state.trees, [projectPath]: result },  // New object every time
}));
```

**Impact:** Cascade re-renders em todos os subscribers mesmo quando dados de outros projetos não mudaram.

**Fix:** Usar immer middleware ou granular per-project substores

### 5.3 CPU - Store Queries on Every Keystroke (MEDIUM)

**File:** `frontend/hooks/use-keyboard-shortcuts.ts:28-29, 39`

```typescript
const handler = (event: KeyboardEvent) => {
  const tilingStore = useTilingLayoutStore.getState();  // EVERY keystroke
  const settingsState = useUserSettingsStore.getState();  // EVERY keystroke
  // ... 10+ store.getState() calls
};
```

**Fix:** Cache state via shallow subscribe ou mover reads para dentro dos handlers específicos

### 5.4 CPU - flattenFileTree O(n) on Every Render (MEDIUM)

**File:** `frontend/components/command-palette.tsx:57-66`

**Impact:** Recursive walk do file tree inteiro em cada render. Projetos grandes (1000+ files) = lento.

**Fix:** Cache flattened list no file-tree store, recomputar apenas quando estrutura muda

### 5.5 Memory - Terminal Instance Cache Without Bounds (MEDIUM)

**File:** `frontend/lib/terminal-instance-cache.ts`

**Impact:** No TTL, no max size limit. Terminal IDs can remain cached indefinitely.

**Fix:** Add TTL (30s) + max cache size (10 terminals)

### 5.6 Memory - External Maps in session-state.ts (MEDIUM)

**File:** `frontend/stores/session-state.ts:28-31`

```typescript
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const tabMetas = new Map<string, TabMeta>();
const tabsWithOutput = new Set<string>();
```

**Impact:** Maps outside Zustand state, not serializable, not visible in DevTools. If `cleanup()` never called, entries leak.

**Fix:** Mover para dentro do Zustand state ou implementar finalization

### 5.7 Memory - IPC Listener Cleanup Promise Pattern (MEDIUM)

**Files:** `frontend/hooks/use-app-metrics.ts:36-52`, `use-agent-chat.ts:112-113`

**Impact:** Promise-based unlisten pode falhar silenciosamente, deixando listeners ativos.

**Fix:** Validar resolução do promise e logar erros genuínos

### 5.8 GPU - WebGL Addon Unconditional (MEDIUM)

**File:** `frontend/components/terminal-session.tsx:7`

**Impact:** WebGL addon carregado para TODOS os terminais, mesmo em sistemas com GPU fraca. Sem fallback graceful.

**Fix:** Condicionar ao performance mode (lite mode check). Add error handling com canvas fallback.

### 5.9 Memory - File Watcher Unbounded Pending Paths (MEDIUM)

**File:** `electron/file-watcher.ts:77-82, 110-116`

**Impact:** `pendingPaths` Set pode crescer para milhares durante operações em massa (ex: npm install). Serialização via IPC de 10k paths é cara.

**Fix:** Max pending limit (500 paths), fallback para invalidação total do projeto

### 5.10 CPU - Git Status Changed Dirs Recomputed Every Fetch (MEDIUM)

**File:** `frontend/stores/git-status.ts:19-30`

```typescript
function computeChangedDirs(statuses: Record<string, string>): Set<string> {
  // O(n * d) where d = average depth - called every fetchStatuses()
}
```

**Fix:** Cache result no store level, recomputar apenas quando status realmente muda

### 5.11 React - FileTreeNode Multiple Selectors Without Shallow (MEDIUM)

**File:** `frontend/components/file-tree-node.tsx:39-68`

```typescript
const expanded = useFileTreeStore((s) => !!s.expandedPaths[node.path]);
const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
// ... 10+ selectors
```

**Impact:** Em virtual list de 1000 nodes = 10,000 subscription updates por tree change.

**Fix:** Usar `useShallow()` hook do Zustand

### 5.12 React - Unmemoized Filter Arrays (MEDIUM)

**Files:** `frontend/components/command-palette.tsx:124-126`, `chat-panel.tsx:124-126`

```typescript
const switchableClis = installedClis.filter(...);  // New array every render
```

**Fix:** Wrap em `useMemo`

### 5.13 IPC - JSON.stringify Key Generation (MEDIUM)

**File:** `frontend/lib/dedup-invoke.ts:22`

```typescript
const key = `${channel}:${JSON.stringify(args)}`;  // O(n) per call
```

**Fix:** Hash-based key ou WeakMap strategy

### 5.14 GPU - Missing will-change on Virtual List Items (LOW)

**File:** `frontend/components/file-tree-sidebar.tsx:77-80`

**Fix:** Add `will-change: transform` nos items de lista virtual

### 5.15 IPC - App Metrics Fixed Interval (LOW)

**File:** `electron/app-metrics.ts:63-78`

**Impact:** Fixed 2s interval even in lite mode

**Fix:** Use 5s+ em lite mode ou desabilitar

---

## 6. Dead Code & Code Smells

### 6.1 Duplicate stripAnsi (HIGH)

**Files:**
- `frontend/lib/strip-ansi.ts:16-21` (proper implementation)
- `frontend/lib/localhost-detector.ts:13-16` (simplified duplicate)

**Fix:** Import from `strip-ansi.ts` em `localhost-detector.ts`

### 6.2 Unused Export: getGitStatusDisplay (MEDIUM)

**File:** `frontend/lib/git-constants.ts:17-19`
**Status:** Only used in tests

**Fix:** Remove or mark deprecated

### 6.3 Unused Export: BLOCKED_SCHEMES (LOW)

**File:** `frontend/lib/browser-url.ts:2-8`
**Status:** Exported but only used internally

**Fix:** Remove export keyword

### 6.4 Export for Testing Only: createPtyDispatcher (LOW)

**File:** `frontend/lib/pty-dispatcher.ts:37-78`

**Fix:** Consider `@internal` annotation or test-only export

### 6.5 Large Components Needing Decomposition (MEDIUM)

| Component | Lines | Recommendation |
|-----------|-------|----------------|
| settings-dialog.tsx | 684 | Split by section (Appearance, Shortcuts, Sessions, etc.) |
| project-sidebar.tsx | 526 | Extract ProjectIcon, AddProjectDialog, ProjectList |
| command-palette.tsx | 470 | Extract command groups into separate modules |
| electron/main.ts | 793 | Extract IPC handlers into separate modules |

### 6.6 Hardcoded Magic Number (LOW)

**File:** `frontend/lib/format.ts:6` - `const k = 1024;`

**Fix:** Rename to `BYTES_PER_KB`

### 6.7 Hardcoded Config Path in lite-mode.ts (LOW)

**File:** `electron/lite-mode.ts:96-101`

**Fix:** Use `getForjaSettingsPath()` consistently

---

## Remediation Plan

### Phase 1: Critical / Quick Wins (1-2 days)

| # | Task | Files | Impact | Effort |
|---|------|-------|--------|--------|
| 1 | Fix duplicate stripAnsi | localhost-detector.ts | Code quality | 15min |
| 2 | Add useMemo to unmemoized filters | command-palette.tsx, chat-panel.tsx | CPU | 30min |
| 3 | Fix git-status O(n) fallback path | git-status.ts | CPU (HIGH) | 1h |
| 4 | Add TTL + max size to terminal cache | terminal-instance-cache.ts | Memory | 1h |
| 5 | Remove unused exports | git-constants.ts, browser-url.ts | Cleanup | 15min |
| 6 | Add will-change to virtual list items | file-tree-sidebar.tsx | GPU | 15min |
| 7 | Conditional WebGL addon loading | terminal-session.tsx | GPU/Memory | 1h |

### Phase 2: Store Refactoring (3-5 days)

| # | Task | Files | Impact | Effort |
|---|------|-------|--------|--------|
| 8 | Deprecate right-panel.ts | right-panel.ts, right-sidebar.tsx | Architecture | 2d |
| 9 | Add inverse sync (store -> tiling) | tiling-layout.ts | Sync bugs | 1d |
| 10 | FileTreeNode useShallow selectors | file-tree-node.tsx | CPU/renders | 2h |
| 11 | Move external Maps into session-state store | session-state.ts | Memory leak | 3h |
| 12 | Cache flattened file tree in store | file-tree.ts, command-palette.tsx | CPU | 3h |
| 13 | Optimize keyboard shortcuts handler | use-keyboard-shortcuts.ts | CPU | 2h |

### Phase 3: IPC & Electron Optimizations (2-3 days)

| # | Task | Files | Impact | Effort |
|---|------|-------|--------|--------|
| 14 | Hash-based dedup-invoke keys | dedup-invoke.ts | IPC perf | 2h |
| 15 | Bounded file watcher pending paths | file-watcher.ts | Memory/IPC | 2h |
| 16 | Dynamic app metrics interval | app-metrics.ts | CPU | 1h |
| 17 | Improve IPC listener cleanup pattern | ipc.ts, hooks | Memory | 4h |
| 18 | Update electron (32 -> 35+) | package.json, compat | Security | 1d |

### Phase 4: Component Decomposition (backlog)

| # | Task | Files | Impact | Effort |
|---|------|-------|--------|--------|
| 19 | Split settings-dialog.tsx | settings-dialog.tsx | Maintainability | 1d |
| 20 | Split project-sidebar.tsx | project-sidebar.tsx | Maintainability | 1d |
| 21 | Split command-palette.tsx | command-palette.tsx | Maintainability | 1d |
| 22 | Extract IPC handlers from main.ts | electron/main.ts | Architecture | 2d |
| 23 | Add ESLint configuration | .eslintrc | Code quality | 2h |

### Phase 5: Zustand Architecture (backlog)

| # | Task | Files | Impact | Effort |
|---|------|-------|--------|--------|
| 24 | Immer middleware for nested stores | file-tree.ts, git-*.ts | Performance | 1d |
| 25 | Per-project substores | Multiple stores | Performance | 2d |
| 26 | Git status dir set caching | git-status.ts | CPU | 3h |

---

## Positive Observations

1. **Tiling layout core is well-designed** - FlexLayout integration with proper block routing, debounced persistence, and good recovery mechanisms
2. **Strong test coverage** - 1498+ tests across 117 files, including integration tests for tiling
3. **Proper selector granularity** - Most Zustand usages correctly use fine-grained selectors
4. **Good ref patterns** - editingNodeIdRef avoids dependency churn in callbacks
5. **Clean file organization** - Clear separation of concerns (stores, components, hooks, lib)
6. **No circular dependencies detected**
7. **Consistent naming conventions** throughout the codebase
8. **Proper debouncing** on IPC calls and layout saves

---

*Report generated by codebase-audit skill*
