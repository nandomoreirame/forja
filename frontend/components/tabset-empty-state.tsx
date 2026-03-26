import { FolderTree, Globe, Plus } from "lucide-react";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useFileTreeStore } from "@/stores/file-tree";
import { ForjaEmptyState } from "@/components/forja-empty-state";

const btnClass =
  "flex items-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-app text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text";

export function TabsetEmptyState() {
  return (
    <ForjaEmptyState>
      <div className="flex items-center gap-3">
        <button
          onClick={() => useCommandPaletteStore.getState().open("sessions")}
          className={btnClass}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Session
        </button>
        <button
          onClick={() => {
            const tilingStore = useTilingLayoutStore.getState();
            if (!tilingStore.hasBlock("tab-file-tree")) {
              const tree = useFileTreeStore.getState().tree;
              tilingStore.addBlock(
                { type: "file-tree", projectName: tree?.root.name },
                undefined,
                "tab-file-tree",
              );
            }
          }}
          className={btnClass}
        >
          <FolderTree className="h-4 w-4" strokeWidth={1.5} />
          Open Files
        </button>
        <button
          onClick={() => {
            const tilingStore = useTilingLayoutStore.getState();
            const blockId = `browser-${Date.now().toString(36)}`;
            tilingStore.addBlock(
              { type: "browser", url: "https://github.com/nandomoreirame/forja" },
              undefined,
              blockId,
            );
          }}
          className={btnClass}
        >
          <Globe className="h-4 w-4" strokeWidth={1.5} />
          Browser
        </button>
      </div>
    </ForjaEmptyState>
  );
}
