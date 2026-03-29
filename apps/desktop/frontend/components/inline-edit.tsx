import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  /** Controlled editing state. When provided alongside onEditingChange, the parent controls edit mode. */
  isEditing?: boolean;
  /** Called when the component wants to change the editing state (controlled mode only). */
  onEditingChange?: (editing: boolean) => void;
}

export function InlineEdit({ value, onSave, className, isEditing: externalIsEditing, onEditingChange }: InlineEditProps) {
  const isControlled = externalIsEditing !== undefined && onEditingChange !== undefined;

  const [internalEditing, setInternalEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  const editing = isControlled ? externalIsEditing : internalEditing;

  useEffect(() => {
    if (editing) {
      setDraft(value);
    }
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;

    // Use requestAnimationFrame to ensure parent layout libraries (e.g., FlexLayout)
    // have finished their post-render DOM/focus operations before we claim focus.
    rafRef.current = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [editing]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function startEditing() {
    if (isControlled) {
      onEditingChange!(true);
    } else {
      setDraft(value);
      setInternalEditing(true);
    }
  }

  function stopEditing() {
    if (isControlled) {
      onEditingChange!(false);
    } else {
      setInternalEditing(false);
    }
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    stopEditing();
  }

  function cancel() {
    stopEditing();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Prevent key events from propagating to parent handlers (e.g., tab's space-to-select)
    e.stopPropagation();

    if (e.key === "Enter") {
      e.preventDefault();
      // Cancel any pending blur save
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Cancel any pending blur save
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      cancel();
    }
  }

  function handleBlur() {
    // In controlled mode, layout libraries (e.g., FlexLayout) may briefly steal
    // focus during re-renders. Use a longer timeout to allow the rAF-based
    // refocus to restore focus before we decide to save/close.
    const delay = isControlled ? 150 : 0;
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;
      // Only save if input is no longer focused
      if (document.activeElement !== inputRef.current) {
        save();
      }
    }, delay);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "rounded border border-ctp-surface1 bg-ctp-surface0 px-1 text-app text-ctp-text outline-none focus:border-brand",
          className,
        )}
      />
    );
  }

  return (
    <span
      onDoubleClick={startEditing}
      className={cn("cursor-default", className)}
    >
      {value}
    </span>
  );
}
