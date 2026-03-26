import { create } from "zustand";
import { invoke } from "@/lib/ipc";

export type QuickActionPosition = "left" | "right";

export interface QuickAction {
  actionId: string;
  position?: QuickActionPosition;
}

interface QuickActionsState {
  actions: QuickAction[];
  loaded: boolean;

  loadActions: () => Promise<void>;
  addAction: (actionId: string, position?: QuickActionPosition) => Promise<void>;
  removeAction: (actionId: string) => Promise<void>;
  moveAction: (fromIndex: number, toIndex: number, position: QuickActionPosition) => Promise<void>;
  moveToPosition: (actionId: string, position: QuickActionPosition) => Promise<void>;
  isPinned: (actionId: string) => boolean;
  getActionsForPosition: (position: QuickActionPosition) => QuickAction[];
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { actionId: "open-files", position: "left" },
  { actionId: "open-browser", position: "left" },
  { actionId: "session:terminal", position: "right" },
];

async function persistActions(actions: QuickAction[]): Promise<void> {
  await invoke("save_quick_actions", { actions });
}

export const useQuickActionsStore = create<QuickActionsState>((set, get) => ({
  actions: [],
  loaded: false,

  loadActions: async () => {
    try {
      const raw = await invoke<QuickAction[] | null>("get_quick_actions");
      // null/undefined means never configured — use defaults
      const actions = raw && raw.length > 0 ? raw : DEFAULT_ACTIONS;
      // Migrate old actions without position field
      const migrated = actions.map((a) => ({
        ...a,
        position: a.position ?? "left" as QuickActionPosition,
      }));
      set({ actions: migrated, loaded: true });
      // Persist defaults or migrated data if needed
      if (!raw || raw.length === 0 || migrated.some((a, i) => a.position !== actions[i]?.position)) {
        await persistActions(migrated);
      }
    } catch {
      set({ actions: DEFAULT_ACTIONS, loaded: true });
    }
  },

  addAction: async (actionId: string, position: QuickActionPosition = "left") => {
    const { actions } = get();
    const alreadyPinned = actions.some((a) => a.actionId === actionId);
    if (alreadyPinned) return;
    const updated = [...actions, { actionId, position }];
    set({ actions: updated });
    await persistActions(updated);
  },

  removeAction: async (actionId: string) => {
    const { actions } = get();
    const updated = actions.filter((a) => a.actionId !== actionId);
    set({ actions: updated });
    await persistActions(updated);
  },

  moveAction: async (fromIndex: number, toIndex: number, position: QuickActionPosition) => {
    const { actions } = get();
    // Get only actions for this position to compute the real indices
    const positionActions = actions.filter((a) => (a.position ?? "left") === position);
    const otherActions = actions.filter((a) => (a.position ?? "left") !== position);

    const reordered = [...positionActions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Rebuild: keep left actions first, then right
    const updated = position === "left"
      ? [...reordered, ...otherActions]
      : [...otherActions, ...reordered];

    set({ actions: updated });
    await persistActions(updated);
  },

  moveToPosition: async (actionId: string, position: QuickActionPosition) => {
    const { actions } = get();
    const updated = actions.map((a) =>
      a.actionId === actionId ? { ...a, position } : a,
    );
    set({ actions: updated });
    await persistActions(updated);
  },

  isPinned: (actionId: string) => {
    return get().actions.some((a) => a.actionId === actionId);
  },

  getActionsForPosition: (position: QuickActionPosition) => {
    return get().actions.filter((a) => (a.position ?? "left") === position);
  },
}));
