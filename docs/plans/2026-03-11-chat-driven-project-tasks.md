# Chat-Driven Project Tasks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add chat-driven task creation for projects, where users create tasks from the sidebar chat with a natural `/task create` command, choose the target AI CLI interactively in chat, and save the generated task prompt into Forja's local config per project.

**Architecture:** Reuse the existing `ChatPanel` and `agent-chat` command interception flow as the entry point. Introduce a new task command parser plus a lightweight chat wizard state machine that lives per chat session and handles project resolution, CLI selection, prompt generation, and final persistence through Electron IPC. Tasks are stored in local Forja config, scoped by project path, and exposed through a small frontend task store for future listing and management.

**Tech Stack:** Electron IPC, React 19, TypeScript, Zustand, `electron-store`, Vitest (frontend + electron).

---

## Existing Modules To Reuse

| Module | Path | Purpose |
|--------|------|---------|
| Chat UI | `frontend/components/chat-panel.tsx` | User-facing sidebar chat surface |
| Agent chat store | `frontend/stores/agent-chat.ts` | Chat session state and command interception entry point |
| Chat IPC | `electron/agent-chat-ipc.ts` | Existing chat session lifecycle IPC |
| Projects store | `frontend/stores/projects.ts` | Resolve project names against user projects |
| CLI registry | `frontend/lib/cli-registry.ts` | Canonical CLI IDs and display names |
| Config persistence | `electron/config.ts` | Local per-user persistence |
| IPC main handlers | `electron/main.ts` | Existing pattern for app-level IPC handlers |

---

## Task 1: Add project task schema to config persistence

**Files:**
- Modify: `electron/config.ts`
- Test: `electron/__tests__/config.test.ts`

**Step 1: Write the failing tests**

Add coverage for:

- storing tasks per project path
- creating a task with generated metadata
- updating a task by `id`
- deleting a task
- ensuring tasks from one project do not appear in another project

Example test cases to add in `electron/__tests__/config.test.ts`:

```typescript
it("stores project tasks per project path", () => {
  const task = createProjectTask("/repo-a", {
    title: "Add task list",
    description: "Create a task list UI",
    preferredCli: "codex",
    promptTemplate: "Do the work",
  });

  const tasks = getProjectTasks("/repo-a");
  expect(tasks).toHaveLength(1);
  expect(tasks[0].title).toBe("Add task list");
});

it("does not leak tasks across projects", () => {
  createProjectTask("/repo-a", {
    title: "Task A",
    description: "A",
    preferredCli: "claude",
    promptTemplate: "A",
  });

  expect(getProjectTasks("/repo-b")).toEqual([]);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/config.test.ts --project electron`

Expected: FAIL because project task helpers and schema do not exist yet.

**Step 3: Write minimal implementation**

In `electron/config.ts`:

- add a `ProjectTask` type
- add `projectTasks: Record<string, ProjectTask[]>` to the config schema
- add helper functions:
  - `getProjectTasks(projectPath: string)`
  - `createProjectTask(projectPath: string, input: ...)`
  - `updateProjectTask(projectPath: string, taskId: string, updates: ...)`
  - `deleteProjectTask(projectPath: string, taskId: string)`

Recommended schema:

```typescript
export interface ProjectTask {
  id: string;
  projectPath: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  preferredCli: "claude" | "codex" | "gemini" | "cursor-agent";
  promptTemplate: string;
  promptOverrides?: Partial<Record<"claude" | "codex" | "gemini" | "cursor-agent", string>>;
  contextPaths: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/config.test.ts --project electron`

Expected: PASS.

**Step 5: Commit**

```bash
git add electron/config.ts electron/__tests__/config.test.ts
git commit -m "feat(tasks): add project task persistence to config"
```

---

## Task 2: Add Electron IPC handlers for project tasks

**Files:**
- Modify: `electron/main.ts`
- Test: `electron/__tests__/main-tasks.test.ts`

**Step 1: Write the failing test**

Create `electron/__tests__/main-tasks.test.ts` covering IPC handlers:

- `tasks:list`
- `tasks:create`
- `tasks:update`
- `tasks:delete`

Use the same mocking pattern as other Electron main-process tests.

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/main-tasks.test.ts --project electron`

Expected: FAIL because the handlers are not registered.

**Step 3: Write minimal implementation**

In `electron/main.ts`:

- register `ipcMain.handle("tasks:list", ...)`
- register `ipcMain.handle("tasks:create", ...)`
- register `ipcMain.handle("tasks:update", ...)`
- register `ipcMain.handle("tasks:delete", ...)`

Each handler should call the new config helpers directly.

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/main-tasks.test.ts --project electron`

Expected: PASS.

**Step 5: Commit**

```bash
git add electron/main.ts electron/__tests__/main-tasks.test.ts
git commit -m "feat(tasks): expose project task IPC handlers"
```

---

## Task 3: Add task command parser for natural `/task create` messages

**Files:**
- Create: `frontend/lib/task-commands.ts`
- Test: `frontend/lib/__tests__/task-commands.test.ts`

**Step 1: Write the failing test**

Cover:

- valid natural command parsing
- invalid or incomplete command rejection
- preserving the raw user description

Example:

```typescript
it("parses a natural task creation command", () => {
  expect(
    parseTaskCommand("/task create forja add a task list interface")
  ).toEqual({
    type: "task",
    action: "create",
    projectName: "forja",
    description: "add a task list interface",
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/lib/__tests__/task-commands.test.ts --project frontend`

Expected: FAIL because the parser does not exist yet.

**Step 3: Write minimal implementation**

Implement `parseTaskCommand()` in `frontend/lib/task-commands.ts`:

- support only `/task create <projectName> <description>` in MVP
- trim whitespace
- reject commands missing either project name or description

Keep the parser narrow and deterministic.

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/lib/__tests__/task-commands.test.ts --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/lib/task-commands.ts frontend/lib/__tests__/task-commands.test.ts
git commit -m "feat(tasks): add natural task command parser"
```

---

## Task 4: Add a chat task creation wizard store

**Files:**
- Create: `frontend/stores/task-creation.ts`
- Test: `frontend/stores/__tests__/task-creation.test.ts`

**Step 1: Write the failing test**

Cover wizard behavior for:

- idle state
- starting task creation from a parsed command
- waiting for CLI selection
- resolving final payload after CLI selection
- reset/cancel behavior

Recommended wizard model:

```typescript
type TaskCreationStep =
  | "idle"
  | "awaiting_cli"
  | "awaiting_project_disambiguation";
```

Track state by `chatSessionId` so the flow stays tied to the active sidebar chat session.

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/task-creation.test.ts --project frontend`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement store actions:

- `startTaskCreation(sessionId, draft)`
- `setCliChoice(sessionId, cliId)`
- `setProjectChoice(sessionId, projectPath)`
- `completeTaskCreation(sessionId)`
- `cancelTaskCreation(sessionId)`

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/task-creation.test.ts --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/task-creation.ts frontend/stores/__tests__/task-creation.test.ts
git commit -m "feat(tasks): add chat task creation wizard store"
```

---

## Task 5: Resolve project names from chat input

**Files:**
- Create: `frontend/lib/project-task-resolution.ts`
- Test: `frontend/lib/__tests__/project-task-resolution.test.ts`

**Step 1: Write the failing test**

Cover:

- exact project name match
- case-insensitive match
- ambiguous match returning multiple candidates
- no match

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/lib/__tests__/project-task-resolution.test.ts --project frontend`

Expected: FAIL.

**Step 3: Write minimal implementation**

Create a helper that accepts:

- the project name from the command
- the list of projects from `useProjectsStore`

and returns one of:

- `{ type: "resolved", project }`
- `{ type: "ambiguous", matches }`
- `{ type: "missing" }`

Use project display names first, not raw paths.

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/lib/__tests__/project-task-resolution.test.ts --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/lib/project-task-resolution.ts frontend/lib/__tests__/project-task-resolution.test.ts
git commit -m "feat(tasks): resolve project names for chat task creation"
```

---

## Task 6: Build generated task titles and prompts

**Files:**
- Create: `frontend/lib/task-prompt-builder.ts`
- Test: `frontend/lib/__tests__/task-prompt-builder.test.ts`

**Step 1: Write the failing test**

Cover:

- auto-derived task title from user description
- prompt generation using project name and selected CLI
- optional CLI-specific prompt overrides

Example expectations:

- title is short and derived from the description
- prompt includes:
  - project name
  - original user intent
  - selected CLI
  - implementation framing

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/lib/__tests__/task-prompt-builder.test.ts --project frontend`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement:

- `deriveTaskTitle(description: string): string`
- `buildTaskPrompt(input: { projectName; description; cliId; ... }): string`

Keep the builder deterministic. Do not call an external model in the MVP.

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/lib/__tests__/task-prompt-builder.test.ts --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/lib/task-prompt-builder.ts frontend/lib/__tests__/task-prompt-builder.test.ts
git commit -m "feat(tasks): generate task titles and prompts"
```

---

## Task 7: Integrate `/task create` flow into the chat store

**Files:**
- Modify: `frontend/stores/agent-chat.ts`
- Test: `frontend/stores/__tests__/agent-chat.test.ts`

**Step 1: Write the failing test**

Add coverage for this flow:

1. user sends `/task create forja add a task list interface`
2. store resolves the project
3. chat responds with a system message asking which CLI to use
4. user replies with `codex`
5. task is created through IPC
6. chat responds with a success summary

Also cover:

- ambiguous project name
- missing project
- invalid CLI response

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/agent-chat.test.ts --project frontend`

Expected: FAIL.

**Step 3: Write minimal implementation**

In `frontend/stores/agent-chat.ts`:

- parse `/task create` before normal message send
- use the task creation store to keep wizard state per session
- if project is resolved, ask: `Which CLI should be used for this task?`
- accept plain replies like `claude`, `codex`, `gemini`, `cursor-agent`
- on valid CLI choice:
  - derive title
  - build prompt
  - call `invoke("tasks:create", ...)`
  - add a system confirmation message

Do not forward the wizard messages to the external AI CLI.

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/agent-chat.test.ts --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/agent-chat.ts frontend/stores/__tests__/agent-chat.test.ts
git commit -m "feat(tasks): add chat-driven task creation flow"
```

---

## Task 8: Add frontend task store and simple task list UI

**Files:**
- Create: `frontend/stores/project-tasks.ts`
- Create: `frontend/components/project-tasks-pane.tsx`
- Test: `frontend/stores/__tests__/project-tasks.test.ts`
- Test: `frontend/components/__tests__/project-tasks-pane.test.tsx`

**Step 1: Write the failing tests**

Cover:

- loading tasks for the active project
- rendering empty state
- rendering saved tasks
- showing task metadata:
  - title
  - status
  - preferred CLI

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/project-tasks.test.ts frontend/components/__tests__/project-tasks-pane.test.tsx --project frontend`

Expected: FAIL.

**Step 3: Write minimal implementation**

Create a lightweight read-focused UI for MVP:

- load tasks for the active project
- render them in a simple pane
- no full editing UI required yet

Integrate the pane where it fits the current layout best without major refactor. A simple first placement is inside an existing side pane area or behind a toggle in `ProjectSidebar`.

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/project-tasks.test.ts frontend/components/__tests__/project-tasks-pane.test.tsx --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/project-tasks.ts frontend/components/project-tasks-pane.tsx frontend/stores/__tests__/project-tasks.test.ts frontend/components/__tests__/project-tasks-pane.test.tsx
git commit -m "feat(tasks): add project task list pane"
```

---

## Task 9: Wire the task list UI into the app shell

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/components/project-sidebar.tsx`
- Test: `frontend/components/__tests__/project-sidebar.test.tsx`
- Test: `frontend/components/__tests__/chat-panel.test.tsx`

**Step 1: Write the failing test**

Cover:

- opening the task list UI for the active project
- visibility of tasks after creating one from chat
- no regression to existing chat toggle behavior

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/project-sidebar.test.tsx frontend/components/__tests__/chat-panel.test.tsx --project frontend`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add a UI entry point for the project task list:

- either a button in `ProjectSidebar`
- or a section in the existing sidebar/pane system

Keep the integration minimal and consistent with current app navigation.

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/components/__tests__/project-sidebar.test.tsx frontend/components/__tests__/chat-panel.test.tsx --project frontend`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/App.tsx frontend/components/project-sidebar.tsx frontend/components/__tests__/project-sidebar.test.tsx frontend/components/__tests__/chat-panel.test.tsx
git commit -m "feat(tasks): integrate project task pane into app shell"
```

---

## Task 10: Final verification and documentation

**Files:**
- Modify: `docs/plans/2026-03-11-chat-driven-project-tasks.md` (if needed for notes)
- Optional: `docs/` usage note if the feature needs user-facing documentation

**Step 1: Run targeted frontend tests**

Run:

```bash
pnpm test frontend/lib/__tests__/task-commands.test.ts frontend/lib/__tests__/project-task-resolution.test.ts frontend/lib/__tests__/task-prompt-builder.test.ts frontend/stores/__tests__/task-creation.test.ts frontend/stores/__tests__/agent-chat.test.ts frontend/stores/__tests__/project-tasks.test.ts frontend/components/__tests__/project-tasks-pane.test.tsx --project frontend
```

Expected: PASS.

**Step 2: Run targeted electron tests**

Run:

```bash
pnpm test electron/__tests__/config.test.ts electron/__tests__/main-tasks.test.ts --project electron
```

Expected: PASS.

**Step 3: Run a manual smoke test**

Checklist:

- open sidebar chat
- create a task with `/task create <project> <description>`
- verify the project resolves correctly
- verify the chat asks for a CLI
- reply with a supported CLI
- verify the task is saved
- verify the task appears in the task list UI
- verify tasks are isolated per project

**Step 4: Commit**

```bash
git add .
git commit -m "feat(tasks): add chat-driven project task creation"
```

---

## Acceptance Criteria

- Users can create a project task from the sidebar chat using a natural `/task create` command
- The system resolves the project by its user-facing name
- If project resolution is ambiguous, the chat asks for clarification
- The chat asks which AI CLI should be used for the task
- The selected CLI is stored as the task's preferred CLI
- The app derives a short task title from the user description
- The app generates and stores a prompt template for the task
- Tasks are persisted locally in Forja config per project
- Tasks are visible in a basic project task list UI
- The task-creation flow is covered by frontend and electron tests

## Notes

- MVP scope is chat-first task creation, not full visual task editing
- Task prompt generation is deterministic in-app, not model-generated
- Prompt execution is out of scope for this plan
- Future work can add task launch into new AI sessions using the saved prompt and preferred CLI
