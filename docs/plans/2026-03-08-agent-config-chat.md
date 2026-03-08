# Shared Agent/Skill/Context Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar no Forja um hub de contexto compartilhado para que o chat crie e mantenha `contexts`, `agents` e `skills` do projeto ativo e sincronize isso entre as IAs CLI instaladas no computador do usuário.

**Architecture:** O Forja passa a ter uma fonte canônica de contexto por projeto (`<repo>/.forja/context`) com índice e versão, além de sincronização bidirecional com diretórios de cada CLI (`.claude`, `.codex`, `.gemini`, etc.). O chat dispara ações declarativas (`/context`, `/agent`, `/skill`) e o backend aplica operações idempotentes (export/import/merge) com auditoria.

**Tech Stack:** Electron (main process + IPC), React 19, TypeScript, Zustand, Vitest (node/jsdom), chokidar.

---

## Referência estudada: `ai-coders-context`

### Padrões que vamos reaproveitar

1. **Fonte canônica única**
- Padrão: `.context/{docs,agents,skills}` como origem da verdade.
- Adaptação Forja: `<repo>/.forja/context/{docs,agents,skills,plans}`.

2. **Registry central de ferramentas**
- Padrão: mapeamento unificado por tool (paths/capabilities de rules, agents, skills).
- Adaptação Forja: `electron/context/tool-registry.ts` com caminhos por CLI detectada localmente.

3. **Sync bidirecional**
- Padrão: export (quick sync) + reverse-sync (import) com `mergeStrategy`.
- Adaptação Forja: `syncContextOut` + `syncContextIn` com estratégias `skip|overwrite|merge|rename`.

4. **Operações compostas (context export)**
- Padrão: uma operação exporta docs + agents + skills.
- Adaptação Forja: `sync_context_bundle` com seleção de componentes e targets.

5. **Orquestração por comandos de alto nível**
- Padrão: gateway com actions (`context`, `agent`, `skill`, `sync`).
- Adaptação Forja: comandos do chat que chamam IPC dedicado mantendo UX natural.

### Diferenças necessárias no Forja

1. O Forja é GUI-first; precisa de estado visual (`status`, `último sync`, `conflitos`) no frontend.
2. Precisamos suportar sessão ativa por projeto (workspace multi-projeto).
3. O fluxo de criação vem do chat interno do Forja, não de MCP externo.

---

## Escopo funcional

### Fase 1 (MVP)

1. Criar/garantir estrutura canônica em `<repo>/.forja/context`.
2. Criar `tool-registry` com mapeamento para CLIs detectadas.
3. Exportar (`outbound`) docs/agents/skills para as CLIs selecionadas.
4. Importar (`inbound`) mudanças das CLIs para o hub canônico.
5. Conflito com estratégias configuráveis (`skip` padrão).
6. Expor IPC para chat acionar:
- `context:init`
- `context:status`
- `context:sync_out`
- `context:sync_in`
- `context:create_skill`
- `context:create_agent`

### Fora do MVP

1. Execução automática contínua em background para todos os projetos abertos.
2. Merge semântico avançado com LLM.
3. Sincronização em nuvem.

---

## Estrutura de dados proposta

### Diretórios por projeto

```text
<repo>/.forja/context/
  docs/
  agents/
  skills/
  plans/
  .index.json
  .sync-log.jsonl
```

### Índice canônico (`.index.json`)

```json
{
  "version": 1,
  "projectPath": "/abs/project",
  "updatedAt": "2026-03-08T00:00:00.000Z",
  "items": [
    {
      "type": "skill",
      "slug": "commit-message",
      "path": ".forja/context/skills/commit-message/SKILL.md",
      "fingerprint": "sha256:...",
      "sources": ["forja-chat", "codex"],
      "lastSyncAt": "2026-03-08T00:00:00.000Z"
    }
  ]
}
```

---

## Task 1: Modelos e registry de paths por CLI

**Files:**
- Create: `electron/context/types.ts`
- Create: `electron/context/tool-registry.ts`
- Test: `electron/__tests__/context-tool-registry.test.ts`

**Step 1: Write the failing test**
- Cobrir resolução de targets para `claude`, `codex`, `gemini`.
- Cobrir capabilities por tipo (`docs`, `agents`, `skills`).

**Step 2: Run test to verify it fails**
- Run: `pnpm test electron/__tests__/context-tool-registry.test.ts --project electron`
- Expected: FAIL (arquivos/módulos ainda inexistentes).

**Step 3: Write minimal implementation**
- Implementar tipos (`ToolDefinition`, `ToolCapabilities`, `ToolPaths`).
- Implementar helpers:
- `getToolById`
- `getToolsWithCapability`
- `resolveExportTarget(toolId, componentType)`

**Step 4: Run test to verify it passes**
- Run: `pnpm test electron/__tests__/context-tool-registry.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**
```bash
git add electron/context/types.ts electron/context/tool-registry.ts electron/__tests__/context-tool-registry.test.ts
git commit -m "feat(context): add cli tool registry for shared context sync"
```

---

## Task 2: Context Hub service (init + index + create item)

**Files:**
- Create: `electron/context/context-hub.ts`
- Test: `electron/__tests__/context-hub.test.ts`

**Step 1: Write the failing test**
- `ensureContextHub(projectPath)` cria estrutura `.forja/context`.
- `createSkill` e `createAgent` criam arquivos com template mínimo.
- `updateIndex` grava fingerprint e metadados.

**Step 2: Run test to verify it fails**
- Run: `pnpm test electron/__tests__/context-hub.test.ts --project electron`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Implementar criação de diretórios.
- Implementar templates mínimos:
- `skills/<slug>/SKILL.md`
- `agents/<slug>.md`
- Atualizar `.index.json`.

**Step 4: Run test to verify it passes**
- Run: `pnpm test electron/__tests__/context-hub.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**
```bash
git add electron/context/context-hub.ts electron/__tests__/context-hub.test.ts
git commit -m "feat(context): add project context hub and canonical index"
```

---

## Task 3: Sync outbound (hub -> CLIs)

**Files:**
- Create: `electron/context/context-sync-out.ts`
- Test: `electron/__tests__/context-sync-out.test.ts`

**Step 1: Write the failing test**
- Exporta `docs/agents/skills` para targets de CLIs suportadas.
- Respeita `force=false` (não sobrescrever).
- Retorna resumo por target.

**Step 2: Run test to verify it fails**
- Run: `pnpm test electron/__tests__/context-sync-out.test.ts --project electron`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Resolver target path via `tool-registry`.
- Copiar/escrever arquivos com estratégia `skip` padrão.
- Registrar operação em `.sync-log.jsonl`.

**Step 4: Run test to verify it passes**
- Run: `pnpm test electron/__tests__/context-sync-out.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**
```bash
git add electron/context/context-sync-out.ts electron/__tests__/context-sync-out.test.ts
git commit -m "feat(context): export context bundle to installed ai clis"
```

---

## Task 4: Sync inbound (CLIs -> hub) com merge strategy

**Files:**
- Create: `electron/context/context-sync-in.ts`
- Test: `electron/__tests__/context-sync-in.test.ts`

**Step 1: Write the failing test**
- Detecta alterações em destinos de CLI e importa para canônico.
- Aplica `mergeStrategy` (`skip|overwrite|rename|merge`).
- Preserva metadata de origem.

**Step 2: Run test to verify it fails**
- Run: `pnpm test electron/__tests__/context-sync-in.test.ts --project electron`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Descobrir arquivos por glob em paths de `tool-registry`.
- Resolver conflitos por estratégia.
- Atualizar `.index.json` e `.sync-log.jsonl`.

**Step 4: Run test to verify it passes**
- Run: `pnpm test electron/__tests__/context-sync-in.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**
```bash
git add electron/context/context-sync-in.ts electron/__tests__/context-sync-in.test.ts
git commit -m "feat(context): import and merge context from external ai clis"
```

---

## Task 5: IPC no Electron para operações de contexto

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Create: `electron/context/context-ipc.ts`
- Test: `electron/__tests__/context-ipc.test.ts`

**Step 1: Write the failing test**
- Validar handlers:
- `context:init`
- `context:status`
- `context:sync_out`
- `context:sync_in`
- `context:create_skill`
- `context:create_agent`

**Step 2: Run test to verify it fails**
- Run: `pnpm test electron/__tests__/context-ipc.test.ts --project electron`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Registrar handlers no `main.ts`.
- Expor ponte segura no `preload.cts`.
- Validar caminhos com `assertPathWithinScope` quando necessário.

**Step 4: Run test to verify it passes**
- Run: `pnpm test electron/__tests__/context-ipc.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**
```bash
git add electron/main.ts electron/preload.cts electron/context/context-ipc.ts electron/__tests__/context-ipc.test.ts
git commit -m "feat(context): expose context hub operations over electron ipc"
```

---

## Task 6: API de frontend + store de estado de sync/contexto

**Files:**
- Modify: `frontend/lib/ipc.ts`
- Create: `frontend/stores/context-hub.ts`
- Test: `frontend/stores/__tests__/context-hub.test.ts`

**Step 1: Write the failing test**
- Store carrega status por projeto.
- Store dispara `syncOut`/`syncIn` e atualiza resumo.
- Estado de erro/loading consistente.

**Step 2: Run test to verify it fails**
- Run: `pnpm test frontend/stores/__tests__/context-hub.test.ts --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Criar wrappers IPC em `frontend/lib/ipc.ts`.
- Implementar store Zustand para context hub.

**Step 4: Run test to verify it passes**
- Run: `pnpm test frontend/stores/__tests__/context-hub.test.ts --project frontend`
- Expected: PASS.

**Step 5: Commit**
```bash
git add frontend/lib/ipc.ts frontend/stores/context-hub.ts frontend/stores/__tests__/context-hub.test.ts
git commit -m "feat(context): add frontend context hub store and ipc client"
```

---

## Task 7: Comandos de chat para criar/sincronizar contexts, agents e skills

**Files:**
- Create: `frontend/lib/chat-context-commands.ts`
- Modify: `frontend/components/project-sidebar.tsx` (atalho/entrypoint de status opcional)
- Modify: `frontend/App.tsx` (integração com fluxo do chat, quando já existir painel)
- Test: `frontend/lib/__tests__/chat-context-commands.test.ts`

**Step 1: Write the failing test**
- Parse de comandos:
- `/context init`
- `/context status`
- `/context sync out`
- `/context sync in --strategy merge`
- `/skill create <slug>`
- `/agent create <slug>`
- Mapeamento para chamadas IPC corretas.

**Step 2: Run test to verify it fails**
- Run: `pnpm test frontend/lib/__tests__/chat-context-commands.test.ts --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Parser de comando + dispatcher.
- Resposta textual amigável para o chat (sucesso, conflito, erro).

**Step 4: Run test to verify it passes**
- Run: `pnpm test frontend/lib/__tests__/chat-context-commands.test.ts --project frontend`
- Expected: PASS.

**Step 5: Commit**
```bash
git add frontend/lib/chat-context-commands.ts frontend/lib/__tests__/chat-context-commands.test.ts frontend/App.tsx frontend/components/project-sidebar.tsx
git commit -m "feat(chat): add context commands for skills agents and sync"
```

---

## Task 8: Watchers e sincronização incremental no projeto ativo

**Files:**
- Modify: `electron/watcher.ts`
- Create: `electron/context/context-watch-sync.ts`
- Test: `electron/__tests__/context-watch-sync.test.ts`

**Step 1: Write the failing test**
- Detectar mudanças em `.forja/context` e marcar `pendingSyncOut`.
- Detectar mudanças em destinos CLI e marcar `pendingSyncIn`.
- Debounce para evitar loop.

**Step 2: Run test to verify it fails**
- Run: `pnpm test electron/__tests__/context-watch-sync.test.ts --project electron`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Integrar eventos de watcher com serviço de sync.
- Garantir que write do próprio Forja não re-dispare import imediato (guard token).

**Step 4: Run test to verify it passes**
- Run: `pnpm test electron/__tests__/context-watch-sync.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**
```bash
git add electron/watcher.ts electron/context/context-watch-sync.ts electron/__tests__/context-watch-sync.test.ts
git commit -m "feat(context): add incremental watch-based sync for active project"
```

---

## Task 9: UX mínima de status e observabilidade

**Files:**
- Modify: `frontend/components/project-sidebar.tsx`
- Create: `frontend/components/context-sync-status.tsx`
- Test: `frontend/components/__tests__/context-sync-status.test.tsx`

**Step 1: Write the failing test**
- Renderiza status: `up-to-date`, `pending-out`, `pending-in`, `conflict`, `error`.
- Ação manual de `Sync now` dispara `syncOut`.

**Step 2: Run test to verify it fails**
- Run: `pnpm test frontend/components/__tests__/context-sync-status.test.tsx --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Badge/indicador discreto no sidebar.
- Tooltip com resumo do último sync.

**Step 4: Run test to verify it passes**
- Run: `pnpm test frontend/components/__tests__/context-sync-status.test.tsx --project frontend`
- Expected: PASS.

**Step 5: Commit**
```bash
git add frontend/components/project-sidebar.tsx frontend/components/context-sync-status.tsx frontend/components/__tests__/context-sync-status.test.tsx
git commit -m "feat(ui): add shared context sync status indicator"
```

---

## Task 10: Documentação de uso e migração

**Files:**
- Modify: `docs/plans/2026-03-08-agent-config-chat.md`
- Create: `docs/guides/shared-context-hub.md`

**Step 1: Write docs checklist**
- Fluxo inicial do usuário.
- Comandos de chat suportados.
- Estratégias de merge.
- Limitações conhecidas.

**Step 2: Write minimal documentation**
- Guia com exemplos fim a fim:
- criar skill via chat
- criar agent via chat
- sync para CLIs
- reverse sync para hub

**Step 3: Verify docs references**
- Garantir caminhos e comandos válidos conforme implementação.

**Step 4: Commit**
```bash
git add docs/guides/shared-context-hub.md docs/plans/2026-03-08-agent-config-chat.md
git commit -m "docs(context): add shared context hub usage and migration guide"
```

---

## Testes de aceitação (fim a fim)

1. Em um projeto com `.claude`, `.codex` e `.gemini`, executar `/context init` no chat.
2. Executar `/skill create commit-message` e confirmar criação no hub.
3. Executar `/context sync out` e validar arquivo propagado para CLIs suportadas.
4. Editar manualmente uma skill em `.codex/skills/...`.
5. Executar `/context sync in --strategy merge`.
6. Validar atualização em `<repo>/.forja/context/skills/...` + index/log.
7. Abrir UI e validar status como `up-to-date`.

Comando sugerido de regressão:
```bash
pnpm test --project electron && pnpm test --project frontend
```

---

## Riscos e mitigação

1. **Conflitos de conteúdo entre CLIs**
- Mitigação: estratégia padrão `skip`, logs e preview futuro.

2. **Loop de sincronização por watchers**
- Mitigação: token de origem + debounce + janela de supressão.

3. **Diferença de formato entre ferramentas**
- Mitigação: adapter por tool no registry e normalização no hub.

4. **Escopo de segurança de paths**
- Mitigação: validação explícita com `assertPathWithinScope` e allowlist.

---

## Decisões arquiteturais

1. Hub canônico será **por projeto** (`<repo>/.forja/context`) para preservar portabilidade.
2. Status e histórico ficam versionáveis (`.index.json` e `.sync-log.jsonl`).
3. Chat é somente orquestrador; toda lógica crítica fica no backend Electron.
4. Estratégia de merge default é `skip` para segurança de conteúdo do usuário.

---

Plan complete and saved to `docs/plans/2026-03-08-agent-config-chat.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
