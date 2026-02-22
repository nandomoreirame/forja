import { useEffect, useState } from 'react';
import { useSyntaxHighlighter } from '@/hooks/use-syntax-highlighter';

interface CodeViewerProps {
  code: string;
  filename: string;
}

export function CodeViewer({ code, filename }: CodeViewerProps) {
  const { isReady, highlight, detectLanguage } = useSyntaxHighlighter();
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (!isReady) return;
    const language = detectLanguage(filename);
    highlight(code, language).then(setHtml);
  }, [code, filename, isReady, highlight, detectLanguage]);

  if (!isReady || !html) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="code-viewer overflow-y-auto overflow-x-scroll p-4 text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: '13px',
        lineHeight: '1.5',
      }}
    />
  );
}
