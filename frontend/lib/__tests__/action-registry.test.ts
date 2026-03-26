import { describe, it, expect } from "vitest";
import {
  getAllActions,
  getAction,
  getActionsByGroup,
  getDynamicActions,
} from "../action-registry";
import type { ActionRegistryEntry } from "../action-registry";

describe("getAllActions", () => {
  it("returns a non-empty array", () => {
    const actions = getAllActions();
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
  });

  it("returns entries with correct shape", () => {
    const actions = getAllActions();
    actions.forEach((action) => {
      expect(action).toHaveProperty("id");
      expect(action).toHaveProperty("label");
      expect(action).toHaveProperty("icon");
      expect(action).toHaveProperty("group");
      expect(typeof action.id).toBe("string");
      expect(typeof action.label).toBe("string");
      expect(typeof action.icon).toBe("string");
      expect(typeof action.group).toBe("string");
    });
  });

  it("does not contain removed session actions", () => {
    const actions = getAllActions();
    const ids = actions.map((a) => a.id);
    expect(ids).not.toContain("new-session");
    expect(ids).not.toContain("go-to-project");
    expect(ids).not.toContain("open-project");
  });

  it("contains all static panels & view actions", () => {
    const actions = getAllActions();
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("open-files");
    expect(ids).toContain("open-browser");
    expect(ids).toContain("toggle-focus-mode");
  });

  it("contains all static terminal actions", () => {
    const actions = getAllActions();
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("zoom-in");
    expect(ids).toContain("zoom-out");
    expect(ids).toContain("zoom-reset");
  });

  it("contains all static git actions", () => {
    const actions = getAllActions();
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("git-changes");
    expect(ids).toContain("toggle-diff-mode");
    expect(ids).toContain("refresh-git");
  });

  it("contains all static settings actions", () => {
    const actions = getAllActions();
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("change-theme");
    expect(ids).toContain("open-settings");
    expect(ids).toContain("edit-settings-json");
    expect(ids).toContain("keyboard-shortcuts");
  });

  it("has 13 static actions total", () => {
    expect(getAllActions()).toHaveLength(13);
  });
});

describe("getAction", () => {
  it("finds a known action by id", () => {
    const action = getAction("open-files");
    expect(action).toBeDefined();
    expect(action?.id).toBe("open-files");
    expect(action?.label).toBe("Toggle Files");
    expect(action?.icon).toBe("folder-tree");
    expect(action?.group).toBe("Panels & View");
  });

  it("returns undefined for an unknown id", () => {
    expect(getAction("non-existent-action")).toBeUndefined();
  });

  it("returns undefined for empty string id", () => {
    expect(getAction("")).toBeUndefined();
  });

  it("finds open-settings action correctly", () => {
    const action = getAction("open-settings");
    expect(action).toBeDefined();
    expect(action?.label).toBe("Open Settings");
    expect(action?.icon).toBe("settings");
    expect(action?.shortcut).toBe("Ctrl+,");
  });

  it("finds open-files with requiresProject flag", () => {
    const action = getAction("open-files");
    expect(action?.requiresProject).toBe(true);
  });

  it("finds open-browser without requiresProject flag", () => {
    const action = getAction("open-browser");
    expect(action?.requiresProject).toBeUndefined();
  });

  it("finds change-theme without shortcut", () => {
    const action = getAction("change-theme");
    expect(action).toBeDefined();
    expect(action?.shortcut).toBeUndefined();
  });
});

describe("getActionsByGroup", () => {
  it("returns a record grouped by group name", () => {
    const grouped = getActionsByGroup();
    expect(typeof grouped).toBe("object");
    expect(grouped).not.toBeNull();
  });

  it("contains all expected groups", () => {
    const grouped = getActionsByGroup();
    const groups = Object.keys(grouped);
    expect(groups).toContain("Panels & View");
    expect(groups).toContain("Terminal");
    expect(groups).toContain("Git");
    expect(groups).toContain("Settings");
    expect(groups).not.toContain("Session");
  });

  it("Panels & View group has 3 actions", () => {
    const grouped = getActionsByGroup();
    expect(grouped["Panels & View"]).toHaveLength(3);
  });

  it("Terminal group has 3 actions", () => {
    const grouped = getActionsByGroup();
    expect(grouped["Terminal"]).toHaveLength(3);
  });

  it("Git group has 3 actions", () => {
    const grouped = getActionsByGroup();
    expect(grouped["Git"]).toHaveLength(3);
  });

  it("Settings group has 4 actions", () => {
    const grouped = getActionsByGroup();
    expect(grouped["Settings"]).toHaveLength(4);
  });

  it("all actions in a group share the same group field", () => {
    const grouped = getActionsByGroup();
    Object.entries(grouped).forEach(([groupName, actions]) => {
      actions.forEach((action) => {
        expect(action.group).toBe(groupName);
      });
    });
  });

  it("total actions across all groups equals getAllActions length", () => {
    const grouped = getActionsByGroup();
    const total = Object.values(grouped).reduce((sum, actions) => sum + actions.length, 0);
    expect(total).toBe(getAllActions().length);
  });
});

describe("getDynamicActions", () => {
  it("returns session entries for installed CLIs", () => {
    const clis = [
      { id: "claude", displayName: "Claude Code" },
      { id: "gemini", displayName: "Gemini CLI" },
    ];
    const actions = getDynamicActions(clis, []);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("session:claude");
    expect(ids).toContain("session:gemini");
  });

  it("session entries have correct label and group", () => {
    const clis = [{ id: "claude", displayName: "Claude Code" }];
    const actions = getDynamicActions(clis, []);
    const action = actions.find((a) => a.id === "session:claude");
    expect(action).toBeDefined();
    expect(action?.label).toBe("Claude Code");
    expect(action?.group).toBe("Session");
  });

  it("returns plugin entries for enabled plugins", () => {
    const plugins = [
      { name: "git-graph", displayName: "Git Graph", icon: "git-graph" },
    ];
    const actions = getDynamicActions([], plugins);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("plugin:git-graph");
  });

  it("plugin entries have correct label, icon and group", () => {
    const plugins = [{ name: "git-graph", displayName: "Git Graph", icon: "git-branch" }];
    const actions = getDynamicActions([], plugins);
    const action = actions.find((a) => a.id === "plugin:git-graph");
    expect(action).toBeDefined();
    expect(action?.label).toBe("Git Graph");
    expect(action?.icon).toBe("git-branch");
    expect(action?.group).toBe("Plugins");
  });

  it("always includes terminal session even with no CLIs and no plugins", () => {
    const actions = getDynamicActions([], []);
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe("session:terminal");
  });

  it("combines CLI, terminal and plugin entries", () => {
    const clis = [{ id: "claude", displayName: "Claude Code" }];
    const plugins = [{ name: "git-graph", displayName: "Git Graph", icon: "git-branch" }];
    const actions = getDynamicActions(clis, plugins);
    expect(actions).toHaveLength(3); // claude + terminal + git-graph
  });

  it("each dynamic action has required ActionRegistryEntry fields", () => {
    const clis = [{ id: "claude", displayName: "Claude Code" }];
    const plugins = [{ name: "git-graph", displayName: "Git Graph", icon: "git-branch" }];
    const actions = getDynamicActions(clis, plugins);
    actions.forEach((action: ActionRegistryEntry) => {
      expect(action).toHaveProperty("id");
      expect(action).toHaveProperty("label");
      expect(action).toHaveProperty("icon");
      expect(action).toHaveProperty("group");
    });
  });
});

describe("ActionRegistryEntry static data correctness", () => {
  it("open-files has requiresProject true", () => {
    const action = getAction("open-files");
    expect(action?.requiresProject).toBe(true);
  });

  it("open-browser has correct icon", () => {
    const action = getAction("open-browser");
    expect(action?.icon).toBe("globe");
  });

  it("toggle-focus-mode has correct icon", () => {
    const action = getAction("toggle-focus-mode");
    expect(action?.icon).toBe("minimize-2");
  });

  it("zoom-in has correct shortcut", () => {
    const action = getAction("zoom-in");
    expect(action?.shortcut).toBe("Ctrl+Alt+=");
  });

  it("zoom-out has correct shortcut", () => {
    const action = getAction("zoom-out");
    expect(action?.shortcut).toBe("Ctrl+Alt+-");
  });

  it("zoom-reset has correct shortcut", () => {
    const action = getAction("zoom-reset");
    expect(action?.shortcut).toBe("Ctrl+Alt+0");
  });

  it("git-changes has correct icon and requiresProject", () => {
    const action = getAction("git-changes");
    expect(action?.icon).toBe("git-compare-arrows");
    expect(action?.requiresProject).toBe(true);
  });

  it("toggle-diff-mode has no shortcut", () => {
    const action = getAction("toggle-diff-mode");
    expect(action?.shortcut).toBeUndefined();
  });

  it("edit-settings-json has correct icon and group", () => {
    const action = getAction("edit-settings-json");
    expect(action).toBeDefined();
    expect(action?.label).toBe("Open Settings (JSON)");
    expect(action?.icon).toBe("file-json");
    expect(action?.group).toBe("Settings");
    expect(action?.shortcut).toBeUndefined();
  });

  it("keyboard-shortcuts has correct shortcut", () => {
    const action = getAction("keyboard-shortcuts");
    expect(action?.shortcut).toBe("Ctrl+?");
  });
});
