import { useEffect, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, ScrollText } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface ImageAttachment {
  kind: 'image'
  name: string
  src: string
  alt: string
}

export type MessagePart =
  | { kind: 'command'; command: string; exitCode: number; output: string; cwd?: string }
  | { kind: 'log'; title: string; lines: string[]; level?: 'info' | 'warn' | 'error' }

export interface MessageLabels {
  copyCode: string
  copied: string
  showAll: string
  showLess: string
  openImage: string
  exit: string
}

export const defaultMessageLabels: MessageLabels = {
  copyCode: 'Copy code',
  copied: 'Copied',
  showAll: 'Show all',
  showLess: 'Show less',
  openImage: 'Open',
  exit: 'exit',
}

const logPreviewLines = 12

interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: { className?: unknown }
  children?: HastNode[]
}

const textOf = (node: HastNode): string =>
  node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join('')

export function CodeBlock({
  code,
  language,
  labels = defaultMessageLabels,
}: {
  code: string
  language?: string
  labels?: MessageLabels
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <TooltipProvider delayDuration={300}>
      <div className="overflow-hidden rounded-[3px] border border-border bg-background">
        <div className="flex h-7 items-center justify-between border-b border-border bg-secondary px-2.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{language ?? 'text'}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={labels.copyCode}
                onClick={() => void copy()}
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? labels.copied : labels.copyCode}</TooltipContent>
          </Tooltip>
          {copied ? (
            <span role="status" className="sr-only">
              {labels.copied}
            </span>
          ) : null}
        </div>
        <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-5 text-foreground">
          <code>{code}</code>
        </pre>
      </div>
    </TooltipProvider>
  )
}

export function MessageMarkdown({
  source,
  labels = defaultMessageLabels,
}: {
  source: string
  labels?: MessageLabels
}) {
  const components: Components = {
    pre: ({ node }) => {
      const code = (node as HastNode | undefined)?.children?.find((c) => c.tagName === 'code')
      const className = code?.properties?.className
      const language = Array.isArray(className)
        ? String(className[0] ?? '').replace(/^language-/, '') || undefined
        : undefined
      return (
        <CodeBlock
          code={code ? textOf(code).replace(/\n$/, '') : ''}
          language={language}
          labels={labels}
        />
      )
    },
    a: ({ href, children }) => (
      <a href={href} rel="noreferrer" target="_blank" className="text-primary underline">
        {children}
      </a>
    ),
  }
  return (
    <div className="grid gap-2 text-[13px] leading-6 text-foreground [&_code]:font-mono [&_:not(pre)>code]:rounded-[2px] [&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:text-[12px] [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:text-[12px] [&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_th]:border-b [&_th]:border-border [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5 [&_input]:mr-1.5 [&_input]:accent-primary [&_li:has(input)]:list-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {source}
      </ReactMarkdown>
    </div>
  )
}

function CommandRun({
  part,
  labels,
}: {
  part: Extract<MessagePart, { kind: 'command' }>
  labels: MessageLabels
}) {
  const ok = part.exitCode === 0
  return (
    <details
      aria-label={`$ ${part.command}`}
      className="group overflow-hidden rounded-[3px] border border-border bg-background"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2.5 py-1.5 font-mono text-[12px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <span className="truncate">
          <span className="text-muted-foreground">$ </span>
          {part.command}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-[2px] border px-1.5 py-px text-[10px]',
            ok
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {labels.exit} {part.exitCode}
        </span>
      </summary>
      <pre className="max-h-56 overflow-auto border-t border-border p-2.5 font-mono text-[11px] leading-5 text-muted-foreground">
        {part.output}
      </pre>
    </details>
  )
}

function LogExcerpt({
  part,
  labels,
}: {
  part: Extract<MessagePart, { kind: 'log' }>
  labels: MessageLabels
}) {
  const [expanded, setExpanded] = useState(false)
  const long = part.lines.length > logPreviewLines
  const lines = expanded ? part.lines : part.lines.slice(0, logPreviewLines)
  return (
    <section
      aria-label={part.title}
      className="overflow-hidden rounded-[3px] border border-border bg-background"
    >
      <header className="flex h-7 items-center gap-2 border-b border-border bg-secondary px-2.5 text-[11px] text-muted-foreground">
        <ScrollText className="size-3.5" aria-hidden="true" />
        <span className="font-mono">{part.title}</span>
      </header>
      <pre
        className={cn(
          'max-h-64 overflow-auto p-2.5 font-mono text-[11px] leading-5',
          part.level === 'error'
            ? 'text-destructive'
            : part.level === 'warn'
              ? 'text-primary'
              : 'text-muted-foreground',
        )}
      >
        {lines.join('\n')}
      </pre>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full border-t border-border px-2.5 py-1 text-left text-[11px] text-primary hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {expanded ? labels.showLess : labels.showAll}
        </button>
      ) : null}
    </section>
  )
}

function ImageThumbnail({ image, labels }: { image: ImageAttachment; labels: MessageLabels }) {
  const [open, setOpen] = useState(false)
  const alt = image.alt.trim()
  if (!alt || !/^(data:image\/|blob:)/.test(image.src)) {
    return <span className="font-mono text-[11px] text-muted-foreground">{image.name}</span>
  }
  return (
    <figure className="grid w-fit gap-1">
      <button
        type="button"
        aria-label={`${labels.openImage} ${image.name}`}
        onClick={() => setOpen(true)}
        className="overflow-hidden rounded-[3px] border border-border focus-visible:outline-2 focus-visible:outline-ring"
      >
        <img src={image.src} alt={alt} className="max-h-40 max-w-60 object-cover" />
      </button>
      <figcaption className="font-mono text-[11px] text-muted-foreground">{image.name}</figcaption>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(90vw,960px)] sm:max-w-[min(90vw,960px)]">
          <DialogTitle className="font-mono text-[12px]">{image.name}</DialogTitle>
          <DialogDescription className="sr-only">{alt}</DialogDescription>
          <img src={image.src} alt={alt} className="max-h-[75vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </figure>
  )
}

export function MessageBody({
  text,
  parts = [],
  attachments = [],
  labels = defaultMessageLabels,
}: {
  text: string
  parts?: MessagePart[]
  attachments?: ImageAttachment[]
  labels?: MessageLabels
}): ReactNode {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-2">
        {text ? <MessageMarkdown source={text} labels={labels} /> : null}
        {parts.map((part, index) =>
          part.kind === 'command' ? (
            <CommandRun key={index} part={part} labels={labels} />
          ) : (
            <LogExcerpt key={index} part={part} labels={labels} />
          ),
        )}
        {attachments.length ? (
          <div className="flex flex-wrap gap-2">
            {attachments.map((image) => (
              <ImageThumbnail key={image.name} image={image} labels={labels} />
            ))}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
