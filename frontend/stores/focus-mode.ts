import { create } from "zustand";
import { useTilingLayoutStore } from "./tiling-layout";
import { useFilePreviewStore } from "./file-preview";
import { useAgentChatStore } from "./agent-chat";

interface FocusModeSnapshot {
  fileTreeOpen: boolean;
  filePreviewOpen: boolean;
  agentChatOpen: boolean;
}

interface FocusModeState {
  isActive: boolean;
  snapshot: FocusModeSnapshot | null;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  toggleFocusMode: () => void;
}

export const useFocusModeStore = create<FocusModeState>((set, get) => ({
  isActive: false,
  snapshot: null,

  enterFocusMode: () => {
    if (get().isActive) return;

    const tiling = useTilingLayoutStore.getState();

    const snapshot: FocusModeSnapshot = {
      fileTreeOpen: tiling.hasBlock("tab-file-tree"),
      filePreviewOpen: tiling.hasBlock("block-file-preview"),
      agentChatOpen: tiling.hasBlock("block-agent-chat"),
    };

    if (snapshot.fileTreeOpen) tiling.removeBlock("tab-file-tree");
    if (snapshot.filePreviewOpen) tiling.removeBlock("block-file-preview");
    if (snapshot.agentChatOpen) tiling.removeBlock("block-agent-chat");

    set({ isActive: true, snapshot });
  },

  exitFocusMode: () => {
    if (!get().isActive) return;

    const { snapshot } = get();
    if (snapshot) {
      const tiling = useTilingLayoutStore.getState();

      if (snapshot.fileTreeOpen && !tiling.hasBlock("tab-file-tree")) {
        tiling.addBlock({ type: "file-tree" }, undefined, "tab-file-tree");
      }

      if (snapshot.filePreviewOpen && !tiling.hasBlock("block-file-preview")) {
        useFilePreviewStore.getState().openPreview();
      }

      if (snapshot.agentChatOpen && !tiling.hasBlock("block-agent-chat")) {
        useAgentChatStore.getState().togglePanel();
      }
    }

    set({ isActive: false, snapshot: null });
  },

  toggleFocusMode: () => {
    if (get().isActive) {
      get().exitFocusMode();
    } else {
      get().enterFocusMode();
    }
  },
}));
