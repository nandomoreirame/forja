import { File, FileCode, FileCog, FileJson, FileTerminal, FileText } from 'lucide-react'
import { cn } from '@/shared/ui/utils'

const byExtension: Record<string, typeof File> = {
  md: FileText,
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  mjs: FileCode,
  html: FileCode,
  json: FileJson,
  yml: FileCog,
  yaml: FileCog,
  sh: FileTerminal,
}

/** A lucide file icon picked by extension; dotfiles such as .env read as config. */
export function FileIcon({ name, className }: { name: string; className?: string }) {
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  const Icon =
    name.startsWith('.') && !name.slice(1).includes('.')
      ? FileCog
      : (byExtension[extension] ?? File)
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', className)} />
}
