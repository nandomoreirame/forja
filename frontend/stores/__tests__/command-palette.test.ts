import { describe, it, expect, beforeEach } from "vitest";
import { useCommandPaletteStore } from "../command-palette";

describe("useCommandPaletteStore", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({
      isOpen: false,
      mode: "files",
    });
  });

  it("has correct initial state", () => {
    const state = useCommandPaletteStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe("files");
  });

  it("opens with files mode", () => {
    useCommandPaletteStore.getState().open("files");
    const state = useCommandPaletteStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.mode).toBe("files");
  });

  it("opens with commands mode", () => {
    useCommandPaletteStore.getState().open("commands");
    const state = useCommandPaletteStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.mode).toBe("commands");
  });

  it("closes the palette", () => {
    useCommandPaletteStore.getState().open("files");
    useCommandPaletteStore.getState().close();
    const state = useCommandPaletteStore.getState();
    expect(state.isOpen).toBe(false);
  });
});
