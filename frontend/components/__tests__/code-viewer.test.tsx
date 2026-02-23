import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CodeViewer } from '../code-viewer';

// Mock Shiki - default: successful initialization
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn((code: string) => {
      return `<pre class="shiki catppuccin-mocha"><code>${code}</code></pre>`;
    }),
    dispose: vi.fn(),
  }),
}));

describe('CodeViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders highlighted code when Shiki is ready', async () => {
    render(<CodeViewer code="const x = 1;" filename="test.ts" />);

    await waitFor(() => {
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });
  });

  it('renders plaintext fallback when Shiki fails to initialize', async () => {
    const { createHighlighter } = await import('shiki');
    vi.mocked(createHighlighter).mockRejectedValueOnce(
      new Error('WASM loading failed')
    );

    render(<CodeViewer code="echo hello" filename="test.sh" />);

    await waitFor(() => {
      const codeElement = screen.getByTestId('code-viewer-fallback');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement).toHaveTextContent('echo hello');
    });
  });

  it('shows line numbers in plaintext fallback', async () => {
    const { createHighlighter } = await import('shiki');
    vi.mocked(createHighlighter).mockRejectedValueOnce(
      new Error('WASM loading failed')
    );

    const code = 'line one\nline two\nline three';
    render(<CodeViewer code={code} filename="test.sh" />);

    await waitFor(() => {
      const fallback = screen.getByTestId('code-viewer-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('line one');
      expect(fallback).toHaveTextContent('line two');
      expect(fallback).toHaveTextContent('line three');
    });
  });

  it('does not show spinner forever when Shiki fails', async () => {
    const { createHighlighter } = await import('shiki');
    vi.mocked(createHighlighter).mockRejectedValueOnce(
      new Error('WASM loading failed')
    );

    render(<CodeViewer code="const x = 1;" filename="test.ts" />);

    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });
});
