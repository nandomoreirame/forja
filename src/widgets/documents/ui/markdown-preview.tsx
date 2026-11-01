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

  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)
  const metadata: { key: string; value: string }[] = []
  const remaining: string[] = []
  if (frontmatter) {
    const lines = frontmatter[1].split(/\r?\n/)
    lines.forEach((line, index) => {
      const scalar = /^([A-Za-z_][\w-]*):\s+([^>|[\]{].*)$/.exec(line)
      if (scalar && !/^\s+\S/.test(lines[index + 1] ?? ''))
        metadata.push({ key: scalar[1], value: scalar[2] })
      else remaining.push(line)
    })
  }

  return (
    <div className="grid gap-3 text-[13px] leading-6 [&_code]:font-mono [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-[14px] [&_h2]:font-semibold [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-3 [&_table]:w-full [&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_th]:border-b [&_th]:border-border [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
      {metadata.length > 0 && (
        <table>
          <tbody>
            {metadata.map(({ key, value }, index) => (
              <tr key={index}>
                <th scope="row">{key}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {remaining.join('\n').trim().length > 0 && (
        <pre className="whitespace-pre-wrap">{remaining.join('\n')}</pre>
      )}
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
        {frontmatter ? source.slice(frontmatter[0].length) : source}
      </ReactMarkdown>
    </div>
  )
}
