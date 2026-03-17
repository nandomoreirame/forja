import { useEffect } from "react";
import { FilePreviewPane } from "@/components/file-preview-pane";
import { useFilePreviewStore } from "@/stores/file-preview";
import type { BlockConfig } from "@/lib/block-registry";

interface FilePreviewBlockProps {
  config?: BlockConfig;
}

export function FilePreviewBlock({ config }: FilePreviewBlockProps) {
  useEffect(() => {
    const filePath = config?.filePath as string | undefined;
    if (filePath && !useFilePreviewStore.getState().currentFile) {
      useFilePreviewStore.getState().loadFile(filePath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full w-full overflow-hidden">
      <FilePreviewPane />
    </div>
  );
}
