import { describe, it, expect, beforeEach } from "vitest";
import { useAppDialogsStore } from "../app-dialogs";

describe("useAppDialogsStore", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
      newSessionOpen: false,
    });
  });

  it("has correct initial state", () => {
    const state = useAppDialogsStore.getState();
    expect(state.shortcutsOpen).toBe(false);
    expect(state.aboutOpen).toBe(false);
    expect(state.newSessionOpen).toBe(false);
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

  it("sets newSessionOpen to true", () => {
    useAppDialogsStore.getState().setNewSessionOpen(true);
    expect(useAppDialogsStore.getState().newSessionOpen).toBe(true);
  });

  it("sets newSessionOpen to false", () => {
    useAppDialogsStore.getState().setNewSessionOpen(true);
    useAppDialogsStore.getState().setNewSessionOpen(false);
    expect(useAppDialogsStore.getState().newSessionOpen).toBe(false);
  });
});
