import { useEffect, useState } from 'react';
import { createHighlighter, Highlighter } from 'shiki';

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  sh: 'bash',
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',
  md: 'markdown',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  sql: 'sql',
  graphql: 'graphql',
  vue: 'vue',
  svelte: 'svelte',
  dockerfile: 'dockerfile',
};

export function useSyntaxHighlighter() {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    createHighlighter({
      themes: ['catppuccin-mocha'],
      langs: [...new Set([...Object.values(LANGUAGE_MAP), 'plaintext'])],
    }).then((hl) => {
      if (disposed) {
        hl.dispose();
        return;
      }
      setHighlighter(hl);
      setIsReady(true);
    });

    return () => {
      disposed = true;
    };
  }, []);

  const detectLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? LANGUAGE_MAP[ext] || 'plaintext' : 'plaintext';
  };

  const highlight = async (code: string, language: string): Promise<string> => {
    if (!highlighter || !isReady) {
      return code;
    }

    try {
      return highlighter.codeToHtml(code, {
        lang: language,
        theme: 'catppuccin-mocha',
      });
    } catch {
      return highlighter.codeToHtml(code, {
        lang: 'plaintext',
        theme: 'catppuccin-mocha',
      });
    }
  };

  return {
    isReady,
    highlight,
    detectLanguage,
  };
}
