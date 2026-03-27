import { useEffect } from "react";
import { useModifierHeldStore, type ModifierCombo } from "@/stores/modifier-held";
import { useUserSettingsStore } from "@/stores/user-settings";

export function detectModifierCombo(e: KeyboardEvent): ModifierCombo | null {
  const mod = e.metaKey || e.ctrlKey;
  // Most specific combos first
  if (mod && e.shiftKey && !e.altKey) return "cmd-shift";
  if (mod && e.altKey && !e.shiftKey) return "cmd-alt";
  // Bare Cmd/Meta (macOS) — without Shift/Alt/Ctrl alongside
  if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) return "cmd";
  // Bare Ctrl (for Ctrl+Tab cycling on macOS)
  if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) return "ctrl";
  if (e.altKey && !e.metaKey && !e.shiftKey && !e.ctrlKey) return "alt";
  return null;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "select") return true;
  // Textarea: allow xterm.js (hidden textarea for input capture)
  if (tag === "textarea" && el.closest(".xterm")) return false;
  // Monaco: check the actual textarea inside the editor for readonly
  const monacoContainer = el.closest(".monaco-editor");
  if (monacoContainer) {
    const monacoTextarea = monacoContainer.querySelector("textarea");
    return monacoTextarea ? !monacoTextarea.readOnly : true;
  }
  // Regular textarea or contentEditable
  if (tag === "textarea") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function isModifierKey(key: string): boolean {
  return key === "Shift" || key === "Control" || key === "Meta" || key === "Alt";
}

export function useModifierHeld(): void {
  const shortcutHints = useUserSettingsStore((s) => s.settings.ui.shortcutHints);

  useEffect(() => {
    if (!shortcutHints) return;

    const store = useModifierHeldStore.getState;

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;
      if (!isModifierKey(e.key)) {
        // A non-modifier key was pressed (e.g., Arrow, digit, letter).
        // Check if modifier combo is still held — if so, keep badges visible.
        const combo = detectModifierCombo(e);
        if (combo && store().activeModifier === combo) {
          // Modifier still held (e.g., Cmd+Shift+Arrow) — don't cancel
          return;
        }
        // Modifier released or changed — cancel
        if (store().activeModifier) {
          store().cancelBadges();
        }
        return;
      }
      const combo = detectModifierCombo(e);
      if (!combo) return;
      if (store().activeModifier !== combo) {
        useModifierHeldStore.getState().setModifier(combo);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (!isModifierKey(e.key) || !store().activeModifier) return;
      // Check if another modifier combo is still held after this key release
      const remaining = detectModifierCombo(e);
      if (remaining) {
        // Transition to the remaining combo (e.g., Cmd+Shift → Cmd)
        if (store().activeModifier !== remaining) {
          useModifierHeldStore.getState().setModifier(remaining);
        }
      } else {
        // All modifiers released
        store().clearModifier();
      }
    }

    function handleBlur() {
      store().cancelBadges();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        store().cancelBadges();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      store().cancelBadges();
    };
  }, [shortcutHints]);
}
