import { describe, it, expect, beforeEach } from "vitest";
import { useAppDialogsStore } from "../app-dialogs";

describe("useAppDialogsStore", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
      settingsOpen: false,
      createWorkspaceOpen: false,
      createWorkspacePendingPath: null,
      createWorkspaceEditId: null,
      createWorkspaceInitialName: null,
    });
  });

  it("has correct initial state", () => {
    const state = useAppDialogsStore.getState();
    expect(state.shortcutsOpen).toBe(false);
    expect(state.aboutOpen).toBe(false);
    expect(state.settingsOpen).toBe(false);
    expect(state.createWorkspaceOpen).toBe(false);
    expect(state.createWorkspacePendingPath).toBeNull();
    expect(state.createWorkspaceEditId).toBeNull();
    expect(state.createWorkspaceInitialName).toBeNull();
  });

  it("sets shortcutsOpen to true", () => {
    useAppDialogsStore.getState().setShortcutsOpen(true);
    expect(useAppDialogsStore.getState().shortcutsOpen).toBe(true);
  });

  it("sets shortcutsOpen to false", () => {
    useAppDialogsStore.getState().setShortcutsOpen(true);
    useAppDialogsStore.getState().setShortcutsOpen(false);
    expect(useAppDialogsStore.getState().shortcutsOpen).toBe(false);
  });

  it("sets aboutOpen to true", () => {
    useAppDialogsStore.getState().setAboutOpen(true);
    expect(useAppDialogsStore.getState().aboutOpen).toBe(true);
  });

  it("sets aboutOpen to false", () => {
    useAppDialogsStore.getState().setAboutOpen(true);
    useAppDialogsStore.getState().setAboutOpen(false);
    expect(useAppDialogsStore.getState().aboutOpen).toBe(false);
  });

  it("sets settingsOpen to true", () => {
    useAppDialogsStore.getState().setSettingsOpen(true);
    expect(useAppDialogsStore.getState().settingsOpen).toBe(true);
  });

  it("sets settingsOpen to false", () => {
    useAppDialogsStore.getState().setSettingsOpen(true);
    useAppDialogsStore.getState().setSettingsOpen(false);
    expect(useAppDialogsStore.getState().settingsOpen).toBe(false);
  });

  it("sets createWorkspaceOpen to true", () => {
    useAppDialogsStore.getState().setCreateWorkspaceOpen(true);
    expect(useAppDialogsStore.getState().createWorkspaceOpen).toBe(true);
    expect(useAppDialogsStore.getState().createWorkspacePendingPath).toBeNull();
  });

  it("sets createWorkspaceOpen with pendingPath", () => {
    useAppDialogsStore.getState().setCreateWorkspaceOpen(true, "/my/project");
    expect(useAppDialogsStore.getState().createWorkspaceOpen).toBe(true);
    expect(useAppDialogsStore.getState().createWorkspacePendingPath).toBe("/my/project");
  });

  it("sets createWorkspaceOpen to false and clears pendingPath", () => {
    useAppDialogsStore.getState().setCreateWorkspaceOpen(true, "/my/project");
    useAppDialogsStore.getState().setCreateWorkspaceOpen(false);
    expect(useAppDialogsStore.getState().createWorkspaceOpen).toBe(false);
    expect(useAppDialogsStore.getState().createWorkspacePendingPath).toBeNull();
    expect(useAppDialogsStore.getState().createWorkspaceEditId).toBeNull();
    expect(useAppDialogsStore.getState().createWorkspaceInitialName).toBeNull();
  });

  it("sets createWorkspaceOpen in rename mode", () => {
    useAppDialogsStore
      .getState()
      .setCreateWorkspaceOpen(true, null, { workspaceId: "ws-1", initialName: "My WS" });

    expect(useAppDialogsStore.getState().createWorkspaceOpen).toBe(true);
    expect(useAppDialogsStore.getState().createWorkspaceEditId).toBe("ws-1");
    expect(useAppDialogsStore.getState().createWorkspaceInitialName).toBe("My WS");
  });
});
