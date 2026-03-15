import { useEffect } from "react";
import { FileTreeSidebar } from "@/components/file-tree-sidebar";
import { useFileTreeStore } from "@/stores/file-tree";

export function FileTreeBlock() {
  useEffect(() => {
    if (!useFileTreeStore.getState().isOpen) {
      useFileTreeStore.setState({ isOpen: true });
    }
  }, []);

  return (
    <div className="h-full w-full overflow-hidden">
      <FileTreeSidebar />
    </div>
  );
}
