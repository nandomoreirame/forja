import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui'
import { getDictionary, type Locale } from '@/shared/i18n'

export function CloseFeatureDialog({
  open,
  locale,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  locale: Locale
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const a = getDictionary(locale).app
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogTitle>{a.closeFeature}</DialogTitle>
        <DialogDescription>{a.closeFeatureDescription}</DialogDescription>
        <DialogFooter>
          <Button variant="outline" autoFocus onClick={() => onOpenChange(false)}>
            {a.keepOpen}
          </Button>
          <Button onClick={onConfirm}>{a.closeFeature}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
