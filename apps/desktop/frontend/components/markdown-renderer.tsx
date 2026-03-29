import { memo, useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { Root, Content } from "mdast";
import { routeLinkClick } from "@/lib/link-router";
import { invoke } from "@/lib/ipc";

const HTML_COMMENT_REGEX = /^<!--[\s\S]*-->$/;

/**
 * Remark plugin that strips HTML comments (<!-- ... -->) from the AST.
 * HTML comments are parsed as `html` type nodes by remark-parse. Without
 * this plugin, react-markdown converts them to visible text nodes since
 * it uses allowDangerousHtml internally and then renders raw nodes as text.
 */
function remarkStripHtmlComments() {
  return function stripHtmlComments(tree: Root) {
    function filterChildren(node: { children?: Content[] }) {
      if (!node.children) return;
      node.children = node.children.filter((child) => {
        if (child.type === "html" && HTML_COMMENT_REGEX.test(child.value.trim())) {
          return false;
        }
        filterChildren(child as { children?: Content[] });
        return true;
      });
    }
    filterChildren(tree);
  };
}

interface MarkdownRendererProps {
  content: string;
  basePath?: string;
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
};

function isRelativePath(src: string): boolean {
  return !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:");
}

function MarkdownImage({
  src,
  alt,
  basePath,
}: {
  src?: string;
  alt?: string;
  basePath?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const shouldResolve = Boolean(src && basePath && isRelativePath(src));

  useEffect(() => {
    if (!shouldResolve || !src || !basePath) return;

    const absolutePath = `${basePath}/${src}`;
    const ext = src.split(".").pop()?.toLowerCase() || "";
    const mime = IMAGE_MIME_TYPES[ext] || "image/png";

    invoke<{ content: string; encoding: string }>("read_file_command", {
      path: absolutePath,
    })
      .then((result) => {
        setDataUrl(`data:${mime};base64,${result.content}`);
      })
      .catch(() => {
        setError(true);
      });
  }, [src, basePath, shouldResolve]);

  if (error) {
    return (
      <span className="text-app-sm text-ctp-overlay1" role="img" aria-label={alt}>
        {alt || "Image failed to load"}
      </span>
    );
  }

  if (shouldResolve) {
    if (!dataUrl) {
      return (
        <span className="inline-block h-4 w-4 animate-pulse rounded bg-ctp-surface0" />
      );
    }
    return <img src={dataUrl} alt={alt || ""} className="max-w-full" />;
  }

  return <img src={src} alt={alt || ""} className="max-w-full" />;
}

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  return (
    <pre
      className="my-2 overflow-x-auto rounded-md bg-ctp-mantle p-3 text-app text-ctp-text"
      data-language={language}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--editor-font-size)",
        lineHeight: "1.5",
      }}
    >
      <code>{code}</code>
    </pre>
  );
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "plaintext";
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  basePath,
}: MarkdownRendererProps) {
  const openExternalLink = useCallback((href: string) => {
    routeLinkClick(href);
  }, []);

  const components: Components = {
    code({ className, children, ...props }) {
      const isInline = !className && typeof children === "string" && !children.includes("\n");

      if (isInline) {
        return (
          <code
            className="rounded bg-ctp-mantle px-1.5 py-0.5 font-mono text-app-sm text-ctp-rosewater"
            {...props}
          >
            {children}
          </code>
        );
      }

      const language = extractLanguage(className);
      const code = String(children).replace(/\n$/, "");

      return <CodeBlock language={language} code={code} />;
    },
    pre({ children }) {
      return <>{children}</>;
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            if (href) openExternalLink(href);
          }}
          className="text-ctp-blue underline decoration-ctp-blue/50 hover:decoration-ctp-blue"
        >
          {children}
        </a>
      );
    },
    img({ src, alt }) {
      return <MarkdownImage src={src} alt={alt} basePath={basePath} />;
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-2 border-l-2 border-ctp-overlay0 pl-3 text-ctp-subtext0">
          {children}
        </blockquote>
      );
    },
    table({ children }) {
      return (
        <div className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-app">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="border border-ctp-surface0 bg-ctp-mantle px-3 py-1.5 text-left font-semibold text-ctp-text">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="border border-ctp-surface0 px-3 py-1.5 text-ctp-subtext1">
          {children}
        </td>
      );
    },
  };

  return (
    <div className="markdown prose text-app leading-relaxed text-ctp-text">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkStripHtmlComments]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
