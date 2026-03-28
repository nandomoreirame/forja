import { describe, it, expect, beforeEach } from "vitest";
import { useModifierHeldStore } from "../modifier-held";

describe("modifier-held store", () => {
  beforeEach(() => {
    useModifierHeldStore.getState().cancelBadges();
  });

  it("starts with null activeModifier and visible false", () => {
    const state = useModifierHeldStore.getState();
    expect(state.activeModifier).toBeNull();
    expect(state.visible).toBe(false);
  });

  it("setModifier sets activeModifier and visible immediately", () => {
    useModifierHeldStore.getState().setModifier("cmd-shift");
    expect(useModifierHeldStore.getState().activeModifier).toBe("cmd-shift");
    expect(useModifierHeldStore.getState().visible).toBe(true);
  });

  it("clearModifier clears everything immediately", () => {
    useModifierHeldStore.getState().setModifier("ctrl");
    useModifierHeldStore.getState().clearModifier();
    expect(useModifierHeldStore.getState().visible).toBe(false);
    expect(useModifierHeldStore.getState().activeModifier).toBeNull();
  });

  it("cancelBadges clears everything immediately", () => {
    useModifierHeldStore.getState().setModifier("cmd-alt");
    useModifierHeldStore.getState().cancelBadges();
    expect(useModifierHeldStore.getState().visible).toBe(false);
    expect(useModifierHeldStore.getState().activeModifier).toBeNull();
  });

  it("changing modifier updates immediately", () => {
    useModifierHeldStore.getState().setModifier("cmd-shift");
    expect(useModifierHeldStore.getState().activeModifier).toBe("cmd-shift");
    useModifierHeldStore.getState().setModifier("ctrl");
    expect(useModifierHeldStore.getState().activeModifier).toBe("ctrl");
    expect(useModifierHeldStore.getState().visible).toBe(true);
  });
});
