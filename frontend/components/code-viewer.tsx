import { useEffect, useMemo, useRef, useState } from 'react';
import { useSyntaxHighlighter } from '@/hooks/use-syntax-highlighter';

interface CodeViewerProps {
  code: string;
  filename: string;
}

export function CodeViewer({ code, filename }: CodeViewerProps) {
  const { isReady, hasError, highlight, detectLanguage } = useSyntaxHighlighter();
  const [html, setHtml] = useState<string>('');
  const prevKeyRef = useRef<string>('');

  const language = useMemo(() => detectLanguage(filename), [detectLanguage, filename]);

  useEffect(() => {
    if (!isReady) return;

    const key = `${language}:${code}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    let cancelled = false;
    highlight(code, language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [code, language, isReady, highlight]);

  if (hasError || (isReady && !html && code)) {
    return (
      <pre
        data-testid="code-viewer-fallback"
        className="code-viewer overflow-y-auto overflow-x-scroll p-4 text-sm text-ctp-text"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--editor-font-size)',
          lineHeight: '1.5',
        }}
      >
        <code>{code}</code>
      </pre>
    );
  }

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

export default CodeViewer;
