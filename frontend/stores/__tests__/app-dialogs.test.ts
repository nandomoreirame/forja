import { describe, it, expect, beforeEach } from "vitest";
import { useAppDialogsStore } from "../app-dialogs";

describe("useAppDialogsStore", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
      createWorkspaceOpen: false,
      createWorkspacePendingPath: null,
    });
  });

  it("has correct initial state", () => {
    const state = useAppDialogsStore.getState();
    expect(state.shortcutsOpen).toBe(false);
    expect(state.aboutOpen).toBe(false);
    expect(state.createWorkspaceOpen).toBe(false);
    expect(state.createWorkspacePendingPath).toBeNull();
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
  });
});
