import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSyntaxHighlighter } from '@/hooks/use-syntax-highlighter';

// Mock Shiki to avoid WASM loading issues in jsdom
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn((code: string) => {
      // Simulate Shiki's HTML output structure
      return `<pre class="shiki catppuccin-mocha" style="background-color:#1e1e2e" tabindex="0"><code><span class="line"><span style="color:#cdd6f4">${code}</span></span></code></pre>`;
    }),
  }),
}));

describe('useSyntaxHighlighter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and set isReady to true', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    expect(result.current.isReady).toBe(false);

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it('should highlight code and return HTML string', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const code = 'const x = 42;';
    const html = await result.current.highlight(code, 'typescript');

    expect(html).toContain('<pre');
    expect(html).toContain('catppuccin-mocha');
    expect(html).toContain(code);
  });

  it('should detect language from file extension correctly', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.detectLanguage('file.ts')).toBe('typescript');
    expect(result.current.detectLanguage('file.tsx')).toBe('tsx');
    expect(result.current.detectLanguage('file.js')).toBe('javascript');
    expect(result.current.detectLanguage('file.jsx')).toBe('jsx');
    expect(result.current.detectLanguage('file.py')).toBe('python');
    expect(result.current.detectLanguage('file.rs')).toBe('rust');
    expect(result.current.detectLanguage('file.go')).toBe('go');
    expect(result.current.detectLanguage('file.rb')).toBe('ruby');
    expect(result.current.detectLanguage('file.java')).toBe('java');
    expect(result.current.detectLanguage('file.sh')).toBe('bash');
    expect(result.current.detectLanguage('file.md')).toBe('markdown');
    expect(result.current.detectLanguage('file.json')).toBe('json');
    expect(result.current.detectLanguage('file.yaml')).toBe('yaml');
    expect(result.current.detectLanguage('file.yml')).toBe('yaml');
    expect(result.current.detectLanguage('file.toml')).toBe('toml');
    expect(result.current.detectLanguage('file.html')).toBe('html');
    expect(result.current.detectLanguage('file.css')).toBe('css');
  });

  it('should return plaintext for unknown extensions', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.detectLanguage('file.xyz')).toBe('plaintext');
    expect(result.current.detectLanguage('unknown')).toBe('plaintext');
  });

  it('should handle files without extensions', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.detectLanguage('Makefile')).toBe('plaintext');
    expect(result.current.detectLanguage('README')).toBe('plaintext');
  });

  it('should handle uppercase extensions', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.detectLanguage('file.TS')).toBe('typescript');
    expect(result.current.detectLanguage('file.PY')).toBe('python');
    expect(result.current.detectLanguage('file.RS')).toBe('rust');
  });

  it('should return raw code when highlighter is not ready', async () => {
    const { result } = renderHook(() => useSyntaxHighlighter());

    const code = 'const x = 42;';
    const html = await result.current.highlight(code, 'typescript');

    // When not ready, should return the raw code
    expect(html).toBe(code);
  });

  it('should fallback to plaintext for unsupported languages', async () => {
    const { createHighlighter } = await import('shiki');
    const mockHighlighter = {
      codeToHtml: vi.fn()
        .mockImplementationOnce(() => {
          throw new Error('Language not supported');
        })
        .mockImplementationOnce((code: string) => {
          return `<pre class="shiki catppuccin-mocha"><code>${code}</code></pre>`;
        }),
    };

    vi.mocked(createHighlighter).mockResolvedValueOnce(mockHighlighter as any);

    const { result } = renderHook(() => useSyntaxHighlighter());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const code = 'some code';
    const html = await result.current.highlight(code, 'unsupported-lang');

    // Should fallback to plaintext
    expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
      lang: 'plaintext',
      theme: 'catppuccin-mocha',
    });
    expect(html).toContain(code);
  });
});
