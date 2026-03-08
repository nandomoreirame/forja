# Plano: Forja - Workspaces, Agentes, Modos Planner/Coder

> **STATUS UPDATE (2026-03-08):** A Fase 1 deste plano (Workspace Enhancement / rename Project → Repository) foi **substituída** por `docs/plans/2026-03-08-project-sidebar.md`, que implementa um modelo mais simples de **Project Sidebar** em vez de workspaces. As Fases 2-4 (modos Planner/Coder, Agentes, Multi-agent panes) permanecem válidas e não foram afetadas.

> **Destino:** Salvar este plano em `/home/nandomoreira/dev/projects/forja/docs/plans/workspaces-agents-planner-coder.md`

## Context

O Forja e um desktop client (Electron + React) para AI coding CLIs. Atualmente funciona como um terminal turbinado com tabs, file tree, project sidebar e git integration. O objetivo e transformar o Forja em uma plataforma mais completa com:

1. ~~**Workspaces/Repositories** - renomear "Projects" para "Repository", melhorar gestao~~ **Substituido** — ver `docs/plans/2026-03-08-project-sidebar.md`
2. **Modo Planner** - chat rico com IA (como Claude Projects/Gemini Gems) com contexto de arquivos
3. **Modo Coder** - manter experiencia atual de terminal PTY
4. **Agentes** - personas configuraveis (Planner) e workflows automatizados (Coder)
5. **Multi-Agent Tabs/Panes** - multiplos agentes simultaneos

**Abordagem:** MVP incremental em 4 fases. CLI como engine primario (parse output), API direta como fallback.

---

## Fase 1: Foundation (Rename + Workspace Enhancement)

### 1.1 Rename "Project" -> "Repository"

**Escopo:** Somente strings user-facing. Interfaces internas mantidas.

**Novo arquivo:**
```
frontend/lib/terminology.ts
```
```typescript
export const TERMS = {
  project: "Repository",
  projects: "Repositories",
  openProject: "Open Repository",
  recentProjects: "Recent Repositories",
  addProject: "Add Repository",
  noProject: "No repository open",
} as const;
```

**Arquivos a modificar (strings):**
- `frontend/App.tsx` - EmptyState labels ("Recent Projects" -> TERMS.recentProjects)
- `frontend/components/titlebar.tsx` - menu items
- `frontend/components/file-tree-sidebar.tsx` - "Add repository" button, headers
- `frontend/components/create-workspace-dialog.tsx` - labels
- `frontend/components/command-palette.tsx` - command names
- `frontend/stores/file-tree.ts` - error messages

**IPC channels:** Nenhuma mudanca. `get_recent_projects`, `add_recent_project` mantem seus nomes internos.

### 1.2 Workspace Enhancement

**Modificar `frontend/stores/workspace.ts`:**
- Adicionar `description?: string` ao `Workspace` interface
- Adicionar `defaultSessionType?: SessionType` (CLI padrao do workspace)
- Adicionar `settings?: WorkspaceSettings` para config per-workspace

**Modificar `electron/config.ts`:**
- Adicionar campos opcionais ao schema do workspace
- Manter backward compatibility (defaults)

```typescript
// Novo tipo em frontend/lib/workspace-types.ts
interface WorkspaceSettings {
  defaultSessionType?: SessionType;
  defaultMode?: WorkspaceMode; // para Fase 2
}
```

**Config migration:** electron-store lida com campos novos via defaults. Workspaces existentes ganham `undefined` nos novos campos.

---

## Fase 2: Planner/Coder Mode Toggle

### 2.1 Tipos Base

**Novo arquivo: `frontend/lib/mode-types.ts`**
```typescript
export type WorkspaceMode = "coder" | "planner";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  blocks?: ChatMessageBlock[];
  metadata?: { rawOutput?: string; model?: string; tokensUsed?: number };
}

export interface ChatMessageBlock {
  type: "text" | "code" | "thinking" | "tool-call" | "tool-result" | "error";
  content: string;
  language?: string;
  toolName?: string;
  isCollapsed?: boolean;
}

export interface PlannerSession {
  id: string;
  agentId: string | null;
  title: string;
  messages: ChatMessage[];
  contextPaths: string[];
  cliBackend: "claude" | "gemini" | "codex" | "terminal";
  isApiMode: boolean;
  createdAt: number;
}
```

### 2.2 Store: Workspace Mode

**Novo arquivo: `frontend/stores/workspace-mode.ts`**
```typescript
interface WorkspaceModeState {
  modes: Record<string, WorkspaceMode>; // workspaceId -> mode
  getMode(workspaceId: string): WorkspaceMode;
  setMode(workspaceId: string, mode: WorkspaceMode): void;
  toggleMode(workspaceId: string): void;
}
```
- Persisted via localStorage (como terminal-tabs)
- Default: "coder"

### 2.3 Store: Planner Session

**Novo arquivo: `frontend/stores/planner-session.ts`**
```typescript
interface PlannerSessionState {
  sessions: Record<string, PlannerSession>; // tabId -> session
  activeSessions: Record<string, string>;   // tabId -> hidden pty tabId

  // Actions
  createSession(tabId: string, opts: { agentId?: string; contextPaths?: string[] }): void;
  addMessage(tabId: string, msg: ChatMessage): void;
  updateLastMessage(tabId: string, update: Partial<ChatMessage>): void;
  setContextPaths(tabId: string, paths: string[]): void;
  addContextPath(tabId: string, path: string): void;
  removeContextPath(tabId: string, path: string): void;
  destroySession(tabId: string): void;
}
```

### 2.4 Modificar Tab System

**Modificar `frontend/stores/terminal-tabs.ts`:**
```typescript
interface TerminalTab {
  id: string;
  name: string;
  path: string;
  isRunning: boolean;
  sessionType: SessionType;
  mode: "coder" | "planner";  // NOVO
  agentId?: string;            // NOVO (Fase 3)
}
```
- `addTab()` recebe `mode` param (default: current workspace mode)
- `addPlannerTab()` novo method: cria tab com mode="planner"

### 2.5 Mode Toggle UI

**Novo componente: `frontend/components/mode-toggle/`**
```
mode-toggle/
  ModeToggle.tsx    - Segmented control (Coder | Planner)
  index.ts
```

- Localizado no `tab-bar.tsx`, ao lado dos tabs
- Toggle keyboard shortcut: `Ctrl+Shift+M`
- Ao trocar modo, novos tabs criados usam o novo modo
- Tabs existentes NAO mudam de modo (cada tab tem seu modo fixo)

**Modificar `frontend/components/tab-bar.tsx`:**
- Adicionar ModeToggle ao lado esquerdo da tab bar
- Mostrar icone diferente para tabs planner vs coder

### 2.6 Planner Pane (Chat UI)

**Novos componentes:**
```
frontend/components/planner/
  PlannerPane.tsx              - Container principal do modo planner
  PlannerContextPanel.tsx      - Painel lateral com arquivos de contexto
  PlannerChatArea.tsx          - Area de mensagens + input
  PlannerMessageList.tsx       - Lista de mensagens com scroll virtual
  PlannerMessage.tsx           - Mensagem individual (user ou assistant)
  PlannerInput.tsx             - Textarea + botao send + file attach
  PlannerToolbar.tsx           - Seletor de modelo/CLI, agent selector
  index.ts
```

**Layout do Planner:**
```
+--------------------------------------------------+
| PlannerToolbar (CLI selector | Agent selector)    |
+----------+---------------------------------------+
| Context  | PlannerChatArea                        |
| Panel    |  +----------------------------------+  |
| (250px)  |  | PlannerMessageList               |  |
|          |  |  [User message]                  |  |
| Files:   |  |  [Assistant message]             |  |
| - src/   |  |  [Code block]                   |  |
| - pkg.   |  |  [Tool call]                    |  |
|          |  +----------------------------------+  |
| [+Add]   |  | PlannerInput                    |  |
|          |  | [textarea]        [Send]        |  |
+----------+---------------------------------------+
```

**Modificar `frontend/components/terminal-pane.tsx`:**
- Condicional: se tab.mode === "planner", renderiza `PlannerPane` ao inves de `TerminalSession`

### 2.7 CLI Parser (Engine Principal)

**Novo modulo: `frontend/lib/cli-parser/`**
```
cli-parser/
  index.ts          - Export e factory
  types.ts          - Parser types
  strip-ansi.ts     - Remove ANSI escape codes
  claude-parser.ts  - Parse Claude Code CLI output
  gemini-parser.ts  - Parse Gemini CLI output
  generic-parser.ts - Fallback parser
```

**Estrategia de parsing:**
```typescript
// cli-parser/types.ts
export interface CliParser {
  feed(data: string): ParseEvent[];
  reset(): void;
}

export type ParseEvent =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language?: string }
  | { type: "thinking"; content: string }
  | { type: "tool-call"; name: string; input: string }
  | { type: "tool-result"; content: string }
  | { type: "message-end" }
  | { type: "prompt-ready" };  // CLI waiting for input
```

**Como funciona:**
1. Planner cria um PTY oculto (`spawn_pty` com sessionType do CLI selecionado)
2. Escuta `pty:data` events no PTY oculto
3. Alimenta dados brutos no `CliParser`
4. Parser emite `ParseEvent[]` que sao convertidos em `ChatMessage` blocks
5. User input no `PlannerInput` -> `write_pty` no PTY oculto
6. O terminal xterm.js NAO e renderizado (PTY e invisible)

**Claude Code Parser (prioridade):**
- Detecta marcadores: `⏺` (mensagem assistant), `❯` (prompt ready)
- Detecta code blocks por ``` markers
- Detecta tool calls por patterns como "Read file:", "Edit file:", etc.
- Detecta thinking blocks (se `--verbose`)
- Fallback: trata tudo como texto

### 2.8 API Fallback

**Novo modulo: `frontend/lib/api-backend/`**
```
api-backend/
  index.ts            - Factory
  anthropic.ts        - Anthropic API (Claude)
  types.ts            - Shared types
```

**Como funciona:**
1. User configura API keys em Settings (novo campo: `apiKeys: Record<string, string>`)
2. User marca "Use API" no PlannerToolbar
3. Em vez de spawn PTY, faz request direto a API
4. Streaming via fetch + ReadableStream (Anthropic Messages API)
5. Resposta parseada em ChatMessage blocks

**Modificar `electron/user-settings.ts`:**
```typescript
// Adicionar ao UserSettings
interface UserSettings {
  // ... existentes ...
  apiKeys?: {
    anthropic?: string;
    google?: string;
    openai?: string;
  };
  plannerDefaults?: {
    preferApi: boolean;      // false = CLI first
    defaultCli: string;      // "claude"
    contextAutoDiscovery: boolean; // true
  };
}
```

**Modificar `electron/main.ts`:**
- Novo IPC: `get_api_key` - retorna API key (nao expor no preload, usar invoke)
- Novo IPC: `set_api_key` - salva API key

**Seguranca:** API keys sao stored no settings.json (local file, ~/.config/forja/). O preload.cts NAO expoe as keys diretamente. O renderer invoca `get_api_key` que retorna a key via IPC (process isolation).

### 2.9 Context Management (Hibrido)

**Auto-discovery (automatico):**
- Ao abrir planner tab, automaticamente coleta:
  - File tree (top-level, max depth 2)
  - Git status (branch, modified files)
  - README.md content (se existir)
  - package.json / Cargo.toml (project type detection)
- Exibido no `PlannerContextPanel` como "Auto-detected"

**Manual selection:**
- User clica [+Add] no PlannerContextPanel
- Abre file picker do file tree (reusa `FileTreeSidebar` como dropdown)
- Arquivos selecionados sao adicionados ao `contextPaths` da session
- Conteudo dos arquivos e injetado no system prompt antes de cada mensagem

**IPC novo:**
```
get_repository_context(path) -> { tree, gitStatus, readme, projectType }
read_files_batch(paths[]) -> { path, content }[]
```

### 2.10 Keyboard Shortcuts (Fase 2)

**Modificar `frontend/hooks/use-keyboard-shortcuts.ts`:**
```
Ctrl+Shift+M  -> Toggle Coder/Planner mode
Ctrl+Enter    -> Send message (Planner mode)
Ctrl+Shift+A  -> Toggle context panel (Planner mode)
```

---

## Fase 3: Agent System

### 3.1 Agent Model

**Novo arquivo: `frontend/lib/agent-types.ts`**
```typescript
export interface Agent {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  contextPaths?: string[];    // default context files
  icon?: string;              // lucide icon name
  color?: string;             // hex color
  // Scope
  workspaceId?: string;       // null = global
  // Planner config
  plannerCli?: string;        // preferred CLI for planner mode
  // Coder config
  coderCommand?: string;      // CLI command override
  coderArgs?: string[];       // extra CLI args
  coderEnv?: Record<string, string>; // env vars
  autoCommands?: string[];    // commands to run after CLI starts
  // Meta
  isBuiltIn?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Agent Persistence

**Modificar `electron/config.ts`:**
```typescript
// Adicionar ao ConfigSchema
{
  // ... existentes ...
  agents: Agent[];  // NOVO
}
```

**Novos IPC handlers em `electron/main.ts`:**
```
get_agents(workspaceId?) -> Agent[]
get_agent(id) -> Agent
create_agent(data) -> Agent
update_agent(id, patch) -> Agent
delete_agent(id) -> void
reorder_agents(ids: string[]) -> void
```

### 3.3 Agent Store

**Novo arquivo: `frontend/stores/agents.ts`**
```typescript
interface AgentStoreState {
  agents: Agent[];
  loading: boolean;

  loadAgents(workspaceId?: string): Promise<void>;
  createAgent(data: Partial<Agent>): Promise<Agent>;
  updateAgent(id: string, patch: Partial<Agent>): Promise<Agent>;
  deleteAgent(id: string): Promise<void>;
  reorderAgents(ids: string[]): Promise<void>;
  getAgent(id: string): Agent | undefined;
  getGlobalAgents(): Agent[];
  getWorkspaceAgents(workspaceId: string): Agent[];
}
```

### 3.4 Agent CRUD UI

**Novos componentes:**
```
frontend/components/agent-manager/
  AgentManager.tsx          - Painel principal (grid de agents)
  AgentCard.tsx             - Card individual com icon, name, actions
  AgentEditor.tsx           - Modal de criacao/edicao
  AgentFormGeneral.tsx      - Nome, descricao, icone, cor
  AgentFormPlanner.tsx      - System prompt, context paths, preferred CLI
  AgentFormCoder.tsx        - CLI command, args, env, auto-commands
  AgentIcon.tsx             - Renderiza icon + color badge
  index.ts
```

**Acesso ao AgentManager:**
1. Settings editor: nova tab "Agents"
2. PlannerToolbar: AgentSelector dropdown com [+ Create Agent]
3. Tab bar: dropdown de new session mostra agents disponiveis
4. Command palette: "Manage Agents" command

### 3.5 Agent em Planner Mode (Persona)

Quando agent selecionado em planner tab:
1. `systemPrompt` do agent e prepended ao contexto
2. `contextPaths` do agent sao auto-adicionados ao PlannerContextPanel
3. `icon` e `color` aparecem no header do PlannerPane
4. `plannerCli` define qual CLI/API usar

**Implementacao:** No `PlannerChatArea`, antes de enviar mensagem:
```typescript
function buildContext(session: PlannerSession, agent: Agent | null): string {
  let context = "";
  if (agent?.systemPrompt) context += agent.systemPrompt + "\n\n";
  // Append file contents from contextPaths
  for (const path of session.contextPaths) {
    const content = await invoke("read_file_command", { path });
    context += `--- ${path} ---\n${content}\n\n`;
  }
  return context;
}
```

Para CLI: context e injetado como primeira mensagem do user (ou via `--system-prompt` flag se suportado).
Para API: context vai no `system` parameter da request.

### 3.6 Agent em Coder Mode (Workflow)

Quando agent selecionado em coder tab:
1. `coderCommand` substitui o CLI padrao (ex: "claude" -> "claude --dangerously-skip-permissions")
2. `coderArgs` sao adicionados ao spawn
3. `coderEnv` e merged no environment do PTY
4. `autoCommands` sao escritos no PTY apos startup (com delay de 500ms entre cada)
5. `systemPrompt` e passado via mecanismo CLI-especifico

**Modificar `electron/pty.ts` > `spawnPty()`:**
```typescript
// Adicionar suporte a agent config
interface SpawnPtyOpts {
  // ... existentes ...
  agentConfig?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    autoCommands?: string[];
  };
}
```

**Modificar `frontend/components/new-session-dropdown.tsx`:**
- Alem de CLIs, mostrar agents disponiveis
- Agents agrupados em secao separada
- Click em agent -> cria tab com agentId

---

## Fase 4: Multi-Agent Tabs/Panes

### 4.1 Agent Status Indicators

**Modificar `frontend/stores/session-state.ts`:**
```typescript
// Estender SessionState para incluir planner states
type SessionState = "idle" | "thinking" | "ready" | "exited" | "streaming";
// "streaming" = planner mode recebendo resposta
```

**Modificar `frontend/components/tab-bar.tsx`:**
- Tabs planner mostram icone do agent (se tiver)
- Tabs planner mostram status: idle (cinza), streaming (pulsing brand), ready (verde)
- Tab name inclui agent name: "[Agent Name] - Chat #1"

### 4.2 Multiple Agent Tabs

Ja suportado pelo sistema de tabs existente. Cada tab e independente com seu proprio:
- PTY session (coder) ou PlannerSession (planner)
- Agent config
- Context paths
- Message history

**Garantir independencia:** Cada planner tab cria seu proprio PTY oculto. Nenhum estado compartilhado entre tabs.

### 4.3 Split Pane Support

**Novo componente: `frontend/components/split-pane/`**
```
split-pane/
  SplitPaneContainer.tsx  - Container com ResizablePanel para 2 panes
  index.ts
```

**Modificar `frontend/components/terminal-pane.tsx`:**
- Suporte a split view: 2 tabs lado a lado
- Hotkey: `Ctrl+\` para split horizontal
- Hotkey: `Ctrl+Shift+\` para split vertical
- Cada pane tem seu proprio tab/session independente

### 4.4 Agent Quick-Launch

**Modificar `frontend/components/new-session-dropdown.tsx`:**
```
New Session Dropdown:
  --- CLIs ---
  Claude Code
  Gemini CLI
  Codex CLI
  Terminal
  --- Agents ---
  [Agent 1 icon] Agent 1
  [Agent 2 icon] Agent 2
  [+ Create Agent]
```

Ao selecionar agent:
- Se modo atual = Planner: cria planner tab com agent
- Se modo atual = Coder: cria coder tab com agent config

---

## Resumo de Arquivos

### Novos Arquivos (~30)

```
frontend/lib/terminology.ts
frontend/lib/mode-types.ts
frontend/lib/workspace-types.ts
frontend/lib/agent-types.ts
frontend/lib/cli-parser/index.ts
frontend/lib/cli-parser/types.ts
frontend/lib/cli-parser/strip-ansi.ts
frontend/lib/cli-parser/claude-parser.ts
frontend/lib/cli-parser/gemini-parser.ts
frontend/lib/cli-parser/generic-parser.ts
frontend/lib/api-backend/index.ts
frontend/lib/api-backend/anthropic.ts
frontend/lib/api-backend/types.ts
frontend/stores/workspace-mode.ts
frontend/stores/planner-session.ts
frontend/stores/agents.ts
frontend/components/mode-toggle/ModeToggle.tsx
frontend/components/mode-toggle/index.ts
frontend/components/planner/PlannerPane.tsx
frontend/components/planner/PlannerContextPanel.tsx
frontend/components/planner/PlannerChatArea.tsx
frontend/components/planner/PlannerMessageList.tsx
frontend/components/planner/PlannerMessage.tsx
frontend/components/planner/PlannerInput.tsx
frontend/components/planner/PlannerToolbar.tsx
frontend/components/planner/index.ts
frontend/components/agent-manager/AgentManager.tsx
frontend/components/agent-manager/AgentCard.tsx
frontend/components/agent-manager/AgentEditor.tsx
frontend/components/agent-manager/AgentFormGeneral.tsx
frontend/components/agent-manager/AgentFormPlanner.tsx
frontend/components/agent-manager/AgentFormCoder.tsx
frontend/components/agent-manager/AgentIcon.tsx
frontend/components/agent-manager/index.ts
frontend/components/split-pane/SplitPaneContainer.tsx
frontend/components/split-pane/index.ts
```

### Arquivos Modificados (~20)

```
electron/main.ts              - Novos IPC handlers (agents, api-keys, repo-context, read_files_batch)
electron/config.ts            - Schema: agents[], workspace settings
electron/pty.ts               - spawnPty() agentConfig support
electron/user-settings.ts     - apiKeys, plannerDefaults
electron/preload.cts          - Novos IPC channels no bridge
frontend/App.tsx              - Terminology, mode-aware routing
frontend/stores/terminal-tabs.ts  - mode field, addPlannerTab()
frontend/stores/session-state.ts  - "streaming" state
frontend/components/tab-bar.tsx     - ModeToggle, agent icons, planner status
frontend/components/terminal-pane.tsx - Condicional planner/coder rendering
frontend/components/titlebar.tsx     - Terminology
frontend/components/file-tree-sidebar.tsx - Terminology
frontend/components/command-palette.tsx   - Agent commands, terminology
frontend/components/new-session-dropdown.tsx - Agent section
frontend/components/create-workspace-dialog.tsx - Terminology
frontend/components/settings-editor.tsx - Agents tab
frontend/hooks/use-keyboard-shortcuts.ts - Novos shortcuts
frontend/lib/ipc.ts           - Novos IPC channel types
frontend/lib/cli-registry.ts  - Agent integration
frontend/lib/settings-types.ts - apiKeys, plannerDefaults
```

---

## Verificacao / Testing

### Fase 1
- [ ] Todas as strings "Project" user-facing substituidas por "Repository"
- [ ] Config existente carrega sem erros (backward compat)
- [ ] Tests existentes passam (adaptar strings)

### Fase 2
- [ ] Mode toggle funciona (Ctrl+Shift+M)
- [ ] Tab planner cria PTY oculto e mostra chat UI
- [ ] User message escrita no PTY, resposta parseada e renderizada
- [ ] Claude CLI parser detecta code blocks e tool calls
- [ ] Context panel mostra auto-discovery + manual files
- [ ] API fallback funciona com API key configurada
- [ ] Session persiste no localStorage (restore apos reload)

### Fase 3
- [ ] Agent CRUD: criar, editar, deletar agents
- [ ] Agent em planner mode: system prompt + context injetados
- [ ] Agent em coder mode: CLI custom + args + env funcionam
- [ ] Agents persistidos em config.json
- [ ] Built-in agents seed automatico

### Fase 4
- [ ] Multiplos tabs planner simultaneos (PTYs independentes)
- [ ] Split pane com 2 agents lado a lado
- [ ] Agent status indicators nos tabs
- [ ] Quick-launch de agents no dropdown

### Testes Unitarios (por fase)
- CLI parsers: `claude-parser.test.ts`, `gemini-parser.test.ts`, `generic-parser.test.ts`
- Stores: `workspace-mode.test.ts`, `planner-session.test.ts`, `agents.test.ts`
- Components: `ModeToggle.test.tsx`, `PlannerInput.test.tsx`, `AgentEditor.test.tsx`
- IPC handlers: `agent-handlers.test.ts`
