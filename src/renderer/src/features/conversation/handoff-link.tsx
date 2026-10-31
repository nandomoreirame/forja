export function HandoffLink({
  linkTo,
  label,
  onViewRequest,
}: {
  linkTo: string
  label: string
  onViewRequest?: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onViewRequest?.(linkTo)}
      className="shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {label}
    </button>
  )
}
