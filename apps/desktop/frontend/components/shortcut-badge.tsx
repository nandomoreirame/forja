import { cn } from "@/lib/utils";

export type ShortcutBadgeVariant =
  | "active"
  | "inactive"
  | "notification"
  | "direction-active"
  | "direction-inactive";

interface ShortcutBadgeProps {
  label: string;
  variant: ShortcutBadgeVariant;
  visible: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ShortcutBadgeVariant, string> = {
  active: "bg-ctp-mauve text-ctp-base",
  inactive: "bg-ctp-surface2 text-ctp-text",
  notification: "bg-ctp-green text-ctp-base",
  "direction-active": "bg-ctp-mauve text-ctp-base",
  "direction-inactive": "bg-ctp-surface2 text-ctp-subtext1",
};

export function ShortcutBadge({ label, variant, visible, className }: ShortcutBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full font-mono text-[9px] font-bold leading-none",
        "h-[14px] min-w-[14px] px-[2px]",
        VARIANT_CLASSES[variant],
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {label}
    </span>
  );
}
