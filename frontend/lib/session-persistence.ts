import type { SessionType } from "./cli-registry";

const STORAGE_KEY = "forja:session:v1";

export interface PersistedSessionTab {
  path: string;
  sessionType: SessionType;
  customName?: string;
}

export interface PersistedSessionState {
  activeWorkspaceId: string | null;
  activeProjectPath: string | null;
  preview: {
    isOpen: boolean;
    currentFile: string | null;
  };
  terminal: {
    activeTabIndex: number;
    split: {
      isEnabled: boolean;
      orientation: "horizontal" | "vertical";
      ratio: number;
      splitTabIndex: number;
      secondarySessionType: SessionType | null;
    };
    tabs: PersistedSessionTab[];
  };
}

function isSessionType(value: unknown): value is SessionType {
  return (
    value === "claude" ||
    value === "terminal" ||
    value === "gemini" ||
    value === "qwen" ||
    value === "aider"
  );
}

function parse(input: unknown): PersistedSessionState | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const preview = (raw.preview ?? {}) as Record<string, unknown>;
  const terminal = (raw.terminal ?? {}) as Record<string, unknown>;
  const split = (terminal.split ?? {}) as Record<string, unknown>;
  const tabsRaw = Array.isArray(terminal.tabs) ? terminal.tabs : [];

  const tabs: PersistedSessionTab[] = tabsRaw
    .map((tab) => {
      const t = tab as Record<string, unknown>;
      if (typeof t.path !== "string" || !isSessionType(t.sessionType)) return null;
      const parsed: PersistedSessionTab = { path: t.path, sessionType: t.sessionType };
      if (typeof t.customName === "string" && t.customName.length > 0) {
        parsed.customName = t.customName;
      }
      return parsed;
    })
    .filter((tab): tab is PersistedSessionTab => tab !== null);

  return {
    activeWorkspaceId:
      typeof raw.activeWorkspaceId === "string" ? raw.activeWorkspaceId : null,
    activeProjectPath:
      typeof raw.activeProjectPath === "string" ? raw.activeProjectPath : null,
    preview: {
      isOpen: Boolean(preview.isOpen),
      currentFile: typeof preview.currentFile === "string" ? preview.currentFile : null,
    },
    terminal: {
      activeTabIndex:
        typeof terminal.activeTabIndex === "number" && terminal.activeTabIndex >= 0
          ? Math.floor(terminal.activeTabIndex)
          : 0,
      split: {
        isEnabled: split.isEnabled === true,
        orientation:
          split.orientation === "horizontal" ? "horizontal" : "vertical",
        ratio:
          typeof split.ratio === "number" && Number.isFinite(split.ratio)
            ? Math.max(10, Math.min(90, Math.round(split.ratio)))
            : 50,
        splitTabIndex:
          typeof split.splitTabIndex === "number" && split.splitTabIndex >= 0
            ? Math.floor(split.splitTabIndex)
            : 0,
        secondarySessionType:
          isSessionType(split.secondarySessionType) ? split.secondarySessionType : null,
      },
      tabs,
    },
  };
}

export function loadPersistedSessionState(): PersistedSessionState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePersistedSessionState(state: PersistedSessionState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}
