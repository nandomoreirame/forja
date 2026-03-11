# TASK-003 — Context Menu e Renomear Tabs de Terminal

**PRD:** PRD-003
**ADR:** ADR-003
**US:** US-003
**Status:** In Progress

---

## Subtasks

### TASK-003-1: Modificar `TerminalTab` e store

**Arquivo:** `frontend/stores/terminal-tabs.ts`

- [ ] Adicionar `customName?: string` na interface `TerminalTab`
- [ ] Adicionar action `renameTab(id: string, name: string): void`
- [ ] Modificar `computeTabDisplayNames` para respeitar `customName`
- [ ] Escrever testes: `__tests__/terminal-tabs.test.ts` (ou atualizar)

### TASK-003-2: Modificar `InlineEdit` para suporte a controle externo

**Arquivo:** `frontend/components/inline-edit.tsx`

- [ ] Adicionar props opcionais: `isEditing?: boolean`, `onEditingChange?: (v: boolean) => void`
- [ ] Quando `isEditing` prop é fornecida, o componente é "controlled"
- [ ] Manter comportamento de double-click quando não controlled
- [ ] Atualizar testes: `__tests__/inline-edit.test.tsx`

### TASK-003-3: Atualizar `TabBar` com ContextMenu

**Arquivo:** `frontend/components/tab-bar.tsx`

- [ ] Envolver cada tab item com `ContextMenu`
- [ ] Adicionar state local `editingTabId: string | null`
- [ ] Implementar `onRenameTab` usando `useTerminalTabsStore.getState().renameTab`
- [ ] Usar `InlineEdit` com `isEditing` controlado para o texto da tab
- [ ] Atualizar testes: `__tests__/tab-bar.test.tsx`
- [ ] Adicionar prop `onRenameTab` ao `TabBarProps`

### TASK-003-4: Atualizar `cli-registry.ts`

**Arquivo:** `frontend/lib/cli-registry.ts`

- [ ] Modificar `computeTabDisplayNames` para respeitar `customName`

---

## Ordem de Implementação

1. TASK-003-1 (store + cli-registry)
2. TASK-003-2 (InlineEdit)
3. TASK-003-3 (TabBar)
