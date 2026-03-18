import { useEffect, useRef } from "react";
import { FilePreviewPane } from "@/components/file-preview-pane";
import { useFilePreviewStore } from "@/stores/file-preview";
import { paneFocusRegistry } from "@/lib/pane-focus-registry";
import type { BlockConfig } from "@/lib/block-registry";

interface FilePreviewBlockProps {
  config?: BlockConfig;
  nodeId?: string;
}

export function FilePreviewBlock({ config, nodeId }: FilePreviewBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filePath = config?.filePath as string | undefined;
    if (filePath && !useFilePreviewStore.getState().currentFile) {
      useFilePreviewStore.getState().loadFile(filePath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!nodeId) return;
    paneFocusRegistry.register(nodeId, () => {
      containerRef.current?.focus();
    });
    return () => { paneFocusRegistry.unregister(nodeId); };
  }, [nodeId]);

  return (
    <div ref={containerRef} tabIndex={0} className="h-full w-full overflow-hidden outline-none">
      <FilePreviewPane />
    </div>
  );
}
