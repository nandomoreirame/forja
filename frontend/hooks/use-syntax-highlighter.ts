import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createHighlighterCore,
  type HighlighterCore,
} from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

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

// Lazy import map: only loads grammar when needed
const LANG_IMPORTS: Record<string, () => Promise<unknown>> = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  scala: () => import('shiki/langs/scala.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  zsh: () => import('shiki/langs/zsh.mjs'),
  fish: () => import('shiki/langs/fish.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  sass: () => import('shiki/langs/sass.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  graphql: () => import('shiki/langs/graphql.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
  svelte: () => import('shiki/langs/svelte.mjs'),
  dockerfile: () => import('shiki/langs/dockerfile.mjs'),
};

// Singleton highlighter shared across all CodeViewer instances
let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>(['plaintext']);

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import('shiki/themes/catppuccin-mocha.mjs')],
      langs: [],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  }
  return highlighterPromise;
}

export function useSyntaxHighlighter() {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const highlighterRef = useRef<HighlighterCore | null>(null);

  useEffect(() => {
    let disposed = false;

    getHighlighter()
      .then((hl) => {
        if (disposed) return;
        highlighterRef.current = hl;
        setIsReady(true);
      })
      .catch(() => {
        if (!disposed) {
          setHasError(true);
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  const detectLanguage = useCallback((filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? LANGUAGE_MAP[ext] || 'plaintext' : 'plaintext';
  }, []);

  const highlight = useCallback(async (code: string, language: string): Promise<string> => {
    const hl = highlighterRef.current;
    if (!hl) return code;

    // Lazy load language if not yet loaded
    if (!loadedLangs.has(language) && LANG_IMPORTS[language]) {
      try {
        const langModule = await LANG_IMPORTS[language]();
        await hl.loadLanguage(langModule as Parameters<typeof hl.loadLanguage>[0]);
        loadedLangs.add(language);
      } catch {
        return hl.codeToHtml(code, { lang: 'plaintext', theme: 'catppuccin-mocha' });
      }
    }

    try {
      return hl.codeToHtml(code, {
        lang: loadedLangs.has(language) ? language : 'plaintext',
        theme: 'catppuccin-mocha',
      });
    } catch {
      return hl.codeToHtml(code, {
        lang: 'plaintext',
        theme: 'catppuccin-mocha',
      });
    }
  }, []);

  return {
    isReady,
    hasError,
    highlight,
    detectLanguage,
  };
}
