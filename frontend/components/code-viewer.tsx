import { memo } from "react";
import { MonacoEditor } from "./monaco-editor";
import { detectLanguage } from "@/lib/detect-language";

interface CodeViewerProps {
  code: string;
  filename: string;
}

export const CodeViewer = memo(function CodeViewer({ code, filename }: CodeViewerProps) {
  const language = detectLanguage(filename);

  return (
    <MonacoEditor
      value={code}
      language={language}
      readOnly
      className="h-full w-full"
    />
  );
});

export default CodeViewer;
