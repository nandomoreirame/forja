import { FilePreviewPane } from "@/components/file-preview-pane";

export function FilePreviewBlock() {
  return (
    <div className="h-full w-full overflow-hidden">
      <FilePreviewPane />
    </div>
  );
}
