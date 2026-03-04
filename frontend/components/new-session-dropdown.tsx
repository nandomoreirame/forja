import { Loader2, Plus, ChevronDown, TerminalSquare } from "lucide-react";
import { useInstalledClis } from "@/hooks/use-installed-clis";
import type { SessionType } from "@/lib/cli-registry";
import { MOD_KEY } from "@/lib/platform";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CliIcon } from "./cli-icon";

interface NewSessionDropdownProps {
  onSessionTypeSelect: (sessionType: SessionType) => void;
}

export function NewSessionDropdown({
  onSessionTypeSelect,
}: NewSessionDropdownProps) {
  const { installedClis, loading } = useInstalledClis();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="New tab"
          className="flex h-9 items-center gap-0.5 px-2 text-ctp-overlay1 transition-colors hover:text-ctp-text"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44 border-ctp-surface0 bg-ctp-base"
      >
        {loading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-ctp-overlay1" />
          </div>
        ) : (
          <>
            {installedClis.map((cli) => (
              <DropdownMenuItem
                key={cli.id}
                onClick={() => onSessionTypeSelect(cli.id)}
                className="flex items-center gap-2 text-ctp-text"
              >
                <CliIcon sessionType={cli.id} className="h-4 w-4" />
                <span>{cli.displayName}</span>
              </DropdownMenuItem>
            ))}
            {installedClis.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => onSessionTypeSelect("terminal")}
              className="flex items-center gap-2 text-ctp-text"
            >
              <TerminalSquare className="h-4 w-4 text-ctp-overlay1" strokeWidth={1.5} />
              <span>Terminal</span>
              <DropdownMenuShortcut>{MOD_KEY}+T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
