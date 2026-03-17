import { useEffect, useState } from "react";
import { Minimize2 } from "lucide-react";
import { useFocusModeStore } from "@/stores/focus-mode";
import { IS_MAC } from "@/lib/platform";

const shortcutLabel = IS_MAC ? "\u2318+Shift+M" : "Ctrl+Shift+M";

export function FocusModeIndicator() {
  const exitFocusMode = useFocusModeStore((s) => s.exitFocusMode);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFaded(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={exitFocusMode}
      onMouseEnter={() => setFaded(false)}
      onMouseLeave={() => setFaded(true)}
      className={`fixed left-1/2 top-2 z-50 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-ctp-surface0/80 px-3 py-1 text-app-sm text-ctp-subtext0 backdrop-blur-sm transition-opacity duration-300 hover:bg-ctp-surface1/90 ${faded ? "opacity-20" : "opacity-100"}`}
    >
      <Minimize2 className="h-3 w-3" strokeWidth={1.5} />
      <span>Focus Mode</span>
      <kbd className="ml-1 rounded bg-ctp-surface1 px-1 py-0.5 font-mono text-app-xs text-ctp-overlay1">
        {shortcutLabel}
      </kbd>
    </button>
  );
}
