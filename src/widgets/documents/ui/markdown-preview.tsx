import { isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MermaidPreview } from './mermaid-preview'

export interface MarkdownPreviewProps {
  source: string
  maxLength?: number
  tooLargeLabel?: string
  diagramErrorLabel?: string
  diagramLoadingLabel?: string
}

const defaultMaxLength = 20_000

export function MarkdownPreview({
  source,
  maxLength = defaultMaxLength,
  tooLargeLabel = 'Content exceeds the preview limit.',
  diagramErrorLabel,
  diagramLoadingLabel,
}: MarkdownPreviewProps) {
  if (source.length > maxLength) {
    return (
      <p role="status" className="text-[12px] text-destructive">
        {tooLargeLabel}
      </p>
    )
  }

  return (
    <div className="grid gap-3 text-[13px] leading-6 [&_code]:font-mono [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-[14px] [&_h2]:font-semibold [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-3 [&_table]:w-full [&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_th]:border-b [&_th]:border-border [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          pre: ({ children }) =>
            isValidElement<{ className?: string }>(children) &&
            children.props.className === 'language-mermaid' ? (
              <div className="overflow-x-auto">{children}</div>
            ) : (
              <pre>{children}</pre>
            ),
          code: ({ className, children, ...props }) =>
            className === 'language-mermaid' ? (
              <MermaidPreview
                source={String(children).trimEnd()}
                errorLabel={diagramErrorLabel}
                loadingLabel={diagramLoadingLabel}
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
