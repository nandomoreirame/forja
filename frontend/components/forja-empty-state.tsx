import type { ReactNode } from "react";
import { Anvil } from "lucide-react";
import { MOD_KEY } from "@/lib/platform";

interface ForjaEmptyStateProps {
  children?: ReactNode;
}

export function ForjaEmptyState({ children }: ForjaEmptyStateProps) {
  const mod = MOD_KEY;
  const kbdClass = "inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-app-xs text-ctp-overlay1";
  const sepClass = "text-app-xs text-ctp-surface1";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
      <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
      <p className="text-app text-ctp-overlay1">
        A dedicated desktop client for vibe coders
      </p>
      <div className="mt-4 flex flex-col items-center gap-3 text-app text-ctp-overlay1">
        <span className="flex items-center gap-1">
          <kbd className={kbdClass}>{mod}</kbd>
          <span className={sepClass}>+</span>
          <kbd className={kbdClass}>P</kbd>
          <span className="ml-2">Quick open</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className={kbdClass}>{mod}</kbd>
          <span className={sepClass}>+</span>
          <kbd className={kbdClass}>Shift</kbd>
          <span className={sepClass}>+</span>
          <kbd className={kbdClass}>P</kbd>
          <span className="ml-2">Command palette</span>
        </span>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
