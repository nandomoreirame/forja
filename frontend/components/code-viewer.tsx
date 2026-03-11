import { lazy, memo, Suspense } from "react";
import { detectLanguage } from "@/lib/detect-language";

const MonacoEditor = lazy(() =>
  import("./monaco-editor").then((module) => ({
    default: module.MonacoEditor,
  })),
);

interface CodeViewerProps {
  code: string;
  filename: string;
}

export const CodeViewer = memo(function CodeViewer({ code, filename }: CodeViewerProps) {
  const language = detectLanguage(filename);

  return (
    <Suspense fallback={<div className="h-full w-full bg-ctp-base" />}>
      <MonacoEditor
        value={code}
        language={language}
        readOnly
        className="h-full w-full"
      />
    </Suspense>
  );
});

export default CodeViewer;
