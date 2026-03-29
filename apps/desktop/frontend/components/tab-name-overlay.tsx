import { useEffect, useRef, useState } from "react";
import { useTilingLayoutStore } from "@/stores/tiling-layout";

/**
 * Renders an absolutely-positioned input *outside* FlexLayout's DOM tree
 * whenever a tab is being renamed.  By living outside the Layout component
 * this input is immune to FlexLayout's re-render / focus-stealing behavior
 * that causes inline inputs inside tabs to flash and close immediately.
 *
 * It locates the target tab's name element via a `data-tab-node-id` attribute
 * set by onRenderTab inside TilingLayout.
 */
export function TabNameOverlay() {
  const editingTabId = useTilingLayoutStore((s) => s.editingTabId);
  const renameBlock = useTilingLayoutStore((s) => s.renameBlock);
  const setEditingTabId = useTilingLayoutStore((s) => s.setEditingTabId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const originalValueRef = useRef("");

  // When editingTabId changes, find the tab span and measure it
  useEffect(() => {
    if (!editingTabId) {
      setRect(null);
      return;
    }

    const span = document.querySelector(
      `[data-tab-node-id="${CSS.escape(editingTabId)}"]`,
    ) as HTMLElement | null;

    if (!span) {
      setEditingTabId(null);
      return;
    }

    const textContent = span.textContent ?? "";
    originalValueRef.current = textContent;
    setDraft(textContent);

    const measured = span.getBoundingClientRect();
    setRect(measured);
  }, [editingTabId, setEditingTabId]);

  // Focus + select the input once it's positioned
  useEffect(() => {
    if (!rect || !inputRef.current) return;
    // Use rAF to ensure the input is painted before focusing
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [rect]);

  if (!editingTabId || !rect) return null;

  function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== originalValueRef.current) {
      renameBlock(editingTabId!, trimmed);
    }
    setEditingTabId(null);
  }

  function cancel() {
    setEditingTabId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  function handleBlur() {
    // Small delay to allow click events to fire before we close
    setTimeout(() => {
      // Only close if we're still the editing tab (another action might have cleared it)
      if (useTilingLayoutStore.getState().editingTabId === editingTabId) {
        save();
      }
    }, 80);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="fixed z-[9999] rounded border border-brand bg-ctp-surface0 px-1 text-app-sm text-ctp-text outline-none"
      style={{
        top: rect.top,
        left: rect.left,
        width: Math.max(rect.width, 80),
        height: rect.height,
      }}
    />
  );
}
