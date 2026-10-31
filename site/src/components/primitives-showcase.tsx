import { Check, Settings } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Kbd,
  KbdGroup,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  statusTone,
  type UiState,
} from '@/shared/ui'
import { galleryCopy } from '../mocks/gallery'

const statusOrder: UiState[] = [
  'approved',
  'draft',
  'stale',
  'waiting',
  'running',
  'completed',
  'failed',
  'interrupted',
]

function Sample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

export function PrimitivesShowcase({ locale }: { locale: Locale }) {
  const c = galleryCopy(locale)
  const roles = getDictionary(locale).workflow.roles.map(([name]) => name)

  return (
    <section
      aria-labelledby="gallery-primitives"
      className="grid gap-8 rounded-lg border border-border bg-card p-5"
    >
      <h3 id="gallery-primitives" className="text-[13px] font-medium">
        {c.primitives}
      </h3>

      <div className="grid gap-3">
        <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.buttons}</h4>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Sample label={c.default}>
            <Button>{c.buttonLabels.primary}</Button>
          </Sample>
          <Sample label={c.hover}>
            <Button className="bg-primary/80">{c.buttonLabels.primary}</Button>
          </Sample>
          <Sample label={c.focus}>
            <Button className="border-ring ring-3 ring-ring/50">{c.buttonLabels.primary}</Button>
          </Sample>
          <Sample label={c.disabled}>
            <Button disabled>{c.buttonLabels.primary}</Button>
          </Sample>
          <Sample label={c.loadingState}>
            <Button loading>{c.buttonLabels.loading}</Button>
          </Sample>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">{c.buttonLabels.secondary}</Button>
          <Button variant="ghost" className="text-primary">
            {c.buttonLabels.ghost}
          </Button>
          <Button variant="outline" size="icon" aria-label={c.buttonLabels.secondary}>
            <Settings />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.inputs}</h4>
          <div className="grid gap-1.5">
            <Label htmlFor="g-model">{c.model}</Label>
            <Input id="g-model" placeholder={c.modelPlaceholder} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-model-focus">{c.model}</Label>
            <Input
              id="g-model-focus"
              defaultValue={c.modelValue}
              className="border-ring ring-3 ring-ring/50"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-model-disabled">{c.model}</Label>
            <Input id="g-model-disabled" disabled placeholder={c.modelPlaceholder} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-model-error">{c.model}</Label>
            <Input
              id="g-model-error"
              aria-invalid="true"
              aria-describedby="g-model-error-text"
              defaultValue="modelo-inexistente-xyz"
            />
            <p id="g-model-error-text" className="text-[12px] text-destructive">
              {c.errorMessage}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Textarea · Select / Combobox
          </h4>
          <div className="grid gap-1.5">
            <Label htmlFor="g-instructions">{c.textareaLabel}</Label>
            <Textarea id="g-instructions" placeholder={c.textareaPlaceholder} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{c.selectLabel}</Label>
              <Select defaultValue={c.selectValue}>
                <SelectTrigger aria-label={c.selectLabel} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div
                role="listbox"
                aria-label={c.selectLabel}
                className="grid gap-0.5 rounded-md border border-border bg-popover p-1 text-[13px]"
              >
                {roles.map((role) => (
                  <div
                    key={role}
                    role="option"
                    aria-selected={role === c.selectValue}
                    className={
                      role === c.selectValue
                        ? 'flex items-center rounded-sm bg-primary/10 px-2 py-1 text-primary'
                        : 'flex items-center rounded-sm px-2 py-1 text-foreground/80'
                    }
                  >
                    {role}
                    {role === c.selectValue ? (
                      <Check className="ml-auto size-3.5" aria-hidden="true" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{c.toolLabel}</Label>
              <Select defaultValue={c.toolValue}>
                <SelectTrigger aria-label={c.toolLabel} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={c.toolValue}>{c.toolValue}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {c.checkboxes}
          </h4>
          <label className="flex items-center gap-2 text-[13px]">
            <Checkbox defaultChecked aria-label={c.checkboxOn} />
            {c.checkboxOn}
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <Checkbox aria-label={c.checkboxOff} />
            {c.checkboxOff}
          </label>
          <label className="flex items-center justify-between gap-3 text-[13px]">
            {c.switchOff}
            <Switch aria-label={c.switchOff} />
          </label>
          <label className="flex items-center justify-between gap-3 text-[13px]">
            {c.switchOn}
            <Switch aria-label={c.switchOn} defaultChecked />
          </label>
        </div>

        <div className="grid gap-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.badges}</h4>
          <div className="flex flex-wrap gap-2">
            {statusOrder.map((state) => (
              <Badge
                key={state}
                variant="outline"
                className={
                  statusTone(state) === 'accent'
                    ? 'gap-1.5 border-primary/60 text-primary'
                    : statusTone(state) === 'danger'
                      ? 'gap-1.5 border-destructive/50 text-destructive'
                      : 'gap-1.5 text-muted-foreground'
                }
              >
                {statusTone(state) === 'accent' ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : null}
                {c.status[state]}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>{c.shortcuts}</span>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>P</Kbd>
            </KbdGroup>
          </div>
        </div>
      </div>
    </section>
  )
}
