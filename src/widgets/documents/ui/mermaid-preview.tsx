import { useEffect, useId, useState } from 'react'

export interface MermaidPreviewProps {
  source: string
  maxLength?: number
  errorLabel?: string
  loadingLabel?: string
}

const defaultMaxLength = 4_000

export function MermaidPreview({
  source,
  maxLength = defaultMaxLength,
  errorLabel = 'Diagram could not be rendered.',
  loadingLabel = 'Rendering diagram',
}: MermaidPreviewProps) {
  const id = useId().replace(/:/g, '-')
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (source.length > maxLength) {
      setFailed(true)
      return
    }
    setFailed(false)
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            background: 'transparent',
            primaryColor: '#18181b',
            primaryBorderColor: '#222226',
            primaryTextColor: '#f4f4f5',
            lineColor: '#a1a1aa',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
          },
        })
        const result = await mermaid.render(`mermaid-${id}`, source)
        if (!cancelled) setSvg(result.svg)
      })
      .catch(() => {
        if (!cancelled) {
          setSvg(null)
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [source, maxLength, id])

  if (failed)
    return (
      <p role="alert" className="text-[12px] text-destructive">
        {errorLabel}
      </p>
    )
  if (!svg)
    return (
      <p role="status" className="text-center text-[12px] text-muted-foreground">
        {loadingLabel}…
      </p>
    )
  return (
    <div
      aria-label="Diagram"
      role="img"
      className="overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
