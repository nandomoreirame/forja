import { useState } from "react";
import { AlertCircle } from "lucide-react";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "image/png";
}

interface ImageViewerProps {
  content: string;
  filename: string;
}

export function ImageViewer({ content, filename }: ImageViewerProps) {
  const [error, setError] = useState(false);
  const mimeType = getMimeType(filename);
  const src = `data:${mimeType};base64,${content}`;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-ctp-red" strokeWidth={1.5} />
          <div>
            <p className="text-app font-medium text-ctp-text">Failed to load image</p>
            <p className="mt-1 text-app-sm text-ctp-overlay1">{filename}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <img
        src={src}
        alt={filename}
        onError={() => setError(true)}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
