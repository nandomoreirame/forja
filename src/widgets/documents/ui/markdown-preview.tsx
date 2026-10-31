import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface MarkdownPreviewProps {
  source: string
  maxLength?: number
}

const defaultMaxLength = 20_000

export function MarkdownPreview({ source, maxLength = defaultMaxLength }: MarkdownPreviewProps) {
  if (source.length > maxLength) {
    return (
      <p role="status" className="text-[12px] text-destructive">
        Conteúdo maior que o limite de visualização.
      </p>
    )
  }

  return (
    <div className="grid gap-3 text-[13px] leading-6 [&_code]:font-mono [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-[14px] [&_h2]:font-semibold [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-3 [&_table]:w-full [&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_th]:border-b [&_th]:border-border [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {source}
      </ReactMarkdown>
    </div>
  )
}
