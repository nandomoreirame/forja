import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from './utils'
export const buttonVariants = cva('ui-button', {
  variants: {
    variant: {
      default: 'button-primary',
      secondary: 'button-secondary',
      ghost: 'button-ghost',
      destructive: 'button-danger',
    },
    size: { default: 'button-normal', sm: 'button-small', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  asChild = false,
  children,
  type = 'button',
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { loading?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="spinner" size={14} />}
      {children}
    </Comp>
  )
}
