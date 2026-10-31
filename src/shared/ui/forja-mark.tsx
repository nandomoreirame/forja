import type { SVGProps } from 'react'

export function ForjaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4z" opacity="0.7" />
      <path d="M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z" />
      <rect x="7.8" y="11.5" width="3" height="6" rx="0.4" opacity="0.85" />
      <rect x="13.2" y="11.5" width="3" height="6" rx="0.4" opacity="0.85" />
      <path d="M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" opacity="0.6" />
    </svg>
  )
}
