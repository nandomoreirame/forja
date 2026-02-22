import { describe, it, expect, beforeEach } from "vitest";
import { useAppDialogsStore } from "../app-dialogs";

describe("useAppDialogsStore", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
    });
  });

  it("has correct initial state", () => {
    const state = useAppDialogsStore.getState();
    expect(state.shortcutsOpen).toBe(false);
    expect(state.aboutOpen).toBe(false);
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
});
