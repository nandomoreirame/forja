import {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  SLASH_COMMANDS,
  filterSlashCommands,
  groupSlashCommands,
  type SlashCommandDef,
} from "@/lib/slash-commands";
import { cn } from "@/lib/utils";

interface SlashCommandMenuProps {
  query: string;
  onSelect: (cmd: SlashCommandDef) => void;
}

export interface SlashCommandMenuHandle {
  moveUp: () => void;
  moveDown: () => void;
  confirm: () => void;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SlashCommandMenuProps
>(function SlashCommandMenu({ query, onSelect }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filterSlashCommands(SLASH_COMMANDS, query),
    [query]
  );

  const groups = useMemo(() => groupSlashCommands(filtered), [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    moveDown() {
      setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    },
    moveUp() {
      setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    },
    confirm() {
      if (filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex]);
      }
    },
  }));

  if (filtered.length === 0) {
    return (
      <div
        data-testid="slash-command-menu"
        className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-lg border border-ctp-surface0 bg-overlay-base shadow-lg"
      >
        <div className="py-6 text-center text-app text-ctp-overlay1">
          No commands found
        </div>
      </div>
    );
  }

  let flatIndex = 0;

  return (
    <div
      data-testid="slash-command-menu"
      className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-lg border border-ctp-surface0 bg-overlay-base shadow-lg"
    >
      <div className="max-h-72 overflow-y-auto overflow-x-hidden p-1">
        {groups.map(([groupName, commands]) => (
          <div key={groupName}>
            <div className="px-2 py-1.5 text-app-sm font-medium text-ctp-overlay1">
              {groupName}
            </div>
            {commands.map((cmd) => {
              const idx = flatIndex++;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.command}
                  ref={isSelected ? selectedRef : undefined}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(cmd)}
                  className={cn(
                    "relative flex cursor-default select-none rounded-md px-2 py-2",
                    isSelected && "bg-ctp-surface0"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-app-sm font-medium text-ctp-text">
                      {cmd.label}
                    </span>
                    <span className="text-app-xs text-ctp-overlay1">
                      {cmd.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
