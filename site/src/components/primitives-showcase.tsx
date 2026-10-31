import { Settings } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import {
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
  StatusBadge,
  Switch,
  Textarea,
  type UiState,
} from '@/shared/ui'
import { galleryCopy } from '../mocks/gallery'
import { gallerySectionCopy } from '../mocks/gallery-sections'

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

function Card({
  label,
  code,
  children,
}: {
  label: string
  code?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid content-start gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {code ? (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">{code}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({
  htmlFor,
  label,
  state,
  tone = 'muted',
}: {
  htmlFor: string
  label: string
  state: string
  tone?: 'muted' | 'accent' | 'danger' | 'disabled'
}) {
  const color = {
    muted: 'text-muted-foreground',
    accent: 'text-primary',
    danger: 'text-destructive',
    disabled: 'text-muted-foreground/40',
  }[tone]
  return (
    <div className="flex items-center justify-between text-[11px]">
      <Label
        htmlFor={htmlFor}
        className={`text-[11px] uppercase tracking-wider ${tone === 'accent' ? 'text-muted-foreground' : color}`}
      >
        {label}
      </Label>
      <span
        aria-hidden="true"
        className={`font-mono ${tone === 'muted' ? 'text-muted-foreground/60' : color}`}
      >
        {state}
      </span>
    </div>
  )
}

function Sample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

export function PrimitivesShowcase({ locale }: { locale: Locale }) {
  const c = galleryCopy(locale)
  const s = gallerySectionCopy(locale)
  const roles = getDictionary(locale).workflow.roles.map(([name]) => name)

  const variants = [
    {
      name: c.buttonLabels.primary,
      className: '',
      loading: c.buttonLabels.loading,
      kind: 'default' as const,
      hover: 'bg-primary/80',
    },
    {
      name: c.buttonLabels.secondary,
      className: '',
      loading: s.loadingSecondary,
      kind: 'outline' as const,
      hover: 'bg-muted',
    },
    {
      name: c.buttonLabels.ghost,
      className: 'text-primary',
      loading: s.loadingGhost,
      kind: 'ghost' as const,
      hover: 'underline text-primary',
    },
  ]

  return (
    <div className="grid gap-4">
      <Card label={s.buttonsGroup} code="button.tsx">
        <div className="grid gap-4">
          {variants.map((variant) => (
            <div key={variant.name} className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Sample label={c.default}>
                <Button variant={variant.kind} className={variant.className}>
                  {variant.name}
                </Button>
              </Sample>
              <Sample label={c.hover}>
                <Button variant={variant.kind} className={variant.hover}>
                  {variant.name}
                </Button>
              </Sample>
              <Sample label={c.focus}>
                <Button
                  variant={variant.kind}
                  className={`${variant.className} border-ring ring-3 ring-ring/50`}
                >
                  {variant.name}
                </Button>
              </Sample>
              <Sample label={c.disabled}>
                <Button variant={variant.kind} className={variant.className} disabled>
                  {variant.name}
                </Button>
              </Sample>
              <Sample label={c.loadingState}>
                <Button variant={variant.kind} className={variant.className} loading>
                  {variant.loading}
                </Button>
              </Sample>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Button variant="outline" size="icon" aria-label={c.buttonLabels.secondary}>
              <Settings />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={c.buttonLabels.secondary}
              className="bg-muted"
            >
              <Settings />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={c.buttonLabels.secondary}
              className="border-ring ring-3 ring-ring/50"
            >
              <Settings />
            </Button>
            <Button variant="outline" size="icon" aria-label={c.buttonLabels.secondary} disabled>
              <Settings />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={c.buttonLabels.secondary}
              loading
              className="text-primary"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card label={s.inputStates} code="input.tsx">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="g-model" label={c.model} state={c.default} />
              <Input id="g-model" placeholder={c.modelPlaceholder} />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="g-model-focus" label={c.model} state={c.focus} tone="accent" />
              <Input
                id="g-model-focus"
                defaultValue={c.modelValue}
                className="border-ring ring-3 ring-ring/50"
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel
                htmlFor="g-model-disabled"
                label={c.model}
                state={c.disabled}
                tone="disabled"
              />
              <Input id="g-model-disabled" disabled placeholder={c.modelPlaceholder} />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="g-model-error" label={c.model} state={c.error} tone="danger" />
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
        </Card>

        <Card label={s.textareaSelect} code="select.tsx">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label
                htmlFor="g-instructions"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                {c.textareaLabel}
              </Label>
              <Textarea id="g-instructions" placeholder={c.textareaPlaceholder} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {c.selectLabel}
                </Label>
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
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {c.toolLabel}
                </Label>
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
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card label={s.checkboxSwitch} code="checkbox.tsx">
          <div className="grid gap-3 text-[13px]">
            <label className="flex items-center gap-2">
              <Checkbox defaultChecked aria-label={c.checkboxOn} />
              {c.checkboxOn}
            </label>
            <label className="flex items-center gap-2">
              <Checkbox aria-label={c.checkboxOff} />
              {c.checkboxOff}
            </label>
            <label className="flex items-center justify-between gap-3">
              {c.switchOff}
              <Switch aria-label={c.switchOff} />
            </label>
            <label className="flex items-center justify-between gap-3">
              {c.switchOn}
              <Switch aria-label={c.switchOn} defaultChecked />
            </label>
          </div>
        </Card>

        <Card label={s.statusLabel} code="badge.tsx">
          <span className="-mt-3 text-[10px] text-muted-foreground">{s.statusHint}</span>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {statusOrder.map((state) => (
              <StatusBadge key={state} state={state}>
                {c.status[state]}
              </StatusBadge>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-wider">{c.shortcuts}:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                {s.submit}:
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Enter</Kbd>
                </KbdGroup>
              </span>
              <span className="flex items-center gap-1">
                {s.commandBar}:
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>P</Kbd>
                </KbdGroup>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
