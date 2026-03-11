import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { Root, Content } from "mdast";
import { routeLinkClick } from "@/lib/link-router";

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
      className="my-2 overflow-x-auto rounded-md bg-ctp-mantle p-3 text-sm text-ctp-text"
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
            className="rounded bg-ctp-mantle px-1.5 py-0.5 font-mono text-[13px] text-ctp-rosewater"
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
          <table className="w-full border-collapse text-sm">{children}</table>
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
    <div className="markdown prose text-sm leading-relaxed text-ctp-text">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkStripHtmlComments]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
