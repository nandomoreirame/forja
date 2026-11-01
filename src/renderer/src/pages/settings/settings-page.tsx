import { useEffect, useRef, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/ui'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { AgentProfile } from '@/renderer/src/features/agent-settings/model'
import {
  effortOptions,
  inactivityError,
  isDirty,
  normalizeProfile,
} from '@/renderer/src/features/agent-settings/model'
import { UnsavedDialog } from '@/renderer/src/features/agent-settings/unsaved-dialog'
import {
  roleIds,
  type ConnectorSnapshot,
  type RoleId,
  type SettingsSnapshot,
  type SettingsTab,
} from '@/renderer/src/shared/api'
import { WorkbenchTabs } from '@/renderer/src/widgets/workbench-tabs'

const catalogSkills = ['rpi-implement', 'git', 'git-flow']

const defaultGeneral: NonNullable<SettingsSnapshot['general']> = {
  skillsRoot: '~/.skills',
  interruptPolicy: 'interrupt',
  guidedMode: true,
  correctionRounds: 3,
  inactivityMinutes: 30,
}

export function SettingsPage() {
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale)
  const a = d.app
  const [saved, setSaved] = useState<SettingsSnapshot | null>(null)
  const [draft, setDraft] = useState<SettingsSnapshot | null>(null)
  const [edited, setEdited] = useState(false)
  const lastScannedRoot = useRef<string | undefined>(undefined)
  const [connectors, setConnectors] = useState<ConnectorSnapshot[]>([])
  const [pending, setPending] = useState<(() => void) | null>(null)
  const viewTab = state.view.kind === 'settings' ? state.view.tab : undefined
  const [tab, setTab] = useState<SettingsTab>(viewTab === 'general' ? 'general' : 'agents')
  const feature = state.snapshot?.features.find((item) => item.id === state.openFeatureIds[0])

  useEffect(() => {
    let active = true
    void Promise.all([state.source.loadSettings(), state.source.loadConnectors()]).then(
      ([value, nextConnectors]) => {
        if (!active) return
        const next = { ...value, general: value.general ?? defaultGeneral }
        lastScannedRoot.current = next.general.skillsRoot
        setSaved(structuredClone(next))
        setDraft(structuredClone(next))
        setEdited(false)
        setConnectors(nextConnectors)
      },
    )
    return () => {
      active = false
    }
  }, [state.source])

  useEffect(() => {
    if (viewTab) setTab(viewTab)
  }, [viewTab])

  const activeRole: RoleId =
    state.view.kind === 'settings' && state.view.role
      ? state.view.role
      : feature
        ? (state.recipients[feature.id] ?? feature.stage)
        : 'research'
  const profile = draft?.agents.find((item) => item.id === activeRole)
  const savedProfile = saved?.agents.find((item) => item.id === activeRole)
  const dirty =
    edited ||
    Boolean(
      draft &&
      saved &&
      profile &&
      savedProfile &&
      isDirty(savedProfile as unknown as AgentProfile, profile as unknown as AgentProfile),
    ) ||
    Boolean(draft && saved && JSON.stringify(draft.general) !== JSON.stringify(saved.general))
  const updateProfile = (update: Partial<AgentProfile>) => {
    if (!draft) return
    setEdited(true)
    setDraft({
      ...draft,
      agents: draft.agents.map((item) => (item.id === activeRole ? { ...item, ...update } : item)),
    })
  }
  const request = (action: () => void) => {
    if (dirty) setPending(() => action)
    else action()
  }
  const refreshSkills = async (root: string | undefined) => {
    lastScannedRoot.current = root
    await state.refreshSkills(root)
  }
  const save = async () => {
    if (!draft) return
    const next = {
      ...draft,
      agents: draft.agents.map(
        (item) => normalizeProfile(item as unknown as AgentProfile) as unknown as typeof item,
      ),
    }
    await state.source.saveSettings(next)
    await state.refreshAgentTools()
    if (next.general?.skillsRoot !== lastScannedRoot.current)
      await refreshSkills(next.general?.skillsRoot)
    setSaved(structuredClone(next))
    setDraft(structuredClone(next))
    setEdited(false)
    const action = pending
    setPending(null)
    action?.()
  }
  const selectTab = (next: string) => {
    const target = next as SettingsTab
    request(() => {
      setTab(target)
      state.openSettings({ tab: target, role: activeRole })
    })
  }
  const selectAgent = (role: RoleId) => {
    request(() => state.openSettings({ tab: 'agents', role }))
  }
  const activeSkills = profile?.skills ?? []
  const inactivityMessage = draft
    ? inactivityError(draft.general?.inactivityMinutes ?? 30)
    : undefined

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-auto">
      <WorkbenchTabs />
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-6">
        <header>
          <h1 className="text-lg font-semibold">{a.settingsTitle}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{a.settingsDescription}</p>
        </header>
        {draft ? (
          <Tabs value={tab} onValueChange={selectTab}>
            <TabsList variant="line">
              <TabsTrigger value="agents" onClick={() => selectTab('agents')}>
                {a.agentsTab}
              </TabsTrigger>
              <TabsTrigger value="general" onClick={() => selectTab('general')}>
                {a.generalTab}
              </TabsTrigger>
              <TabsTrigger value="connectors" onClick={() => selectTab('connectors')}>
                Connectors
              </TabsTrigger>
            </TabsList>
            <TabsContent value="agents" className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="settings-agent">{a.agent}</Label>
                  <Select
                    value={activeRole}
                    onValueChange={(value) => selectAgent(value as RoleId)}
                  >
                    <SelectTrigger id="settings-agent" aria-label={a.agent} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleIds.map((role) => (
                        <SelectItem key={role} value={role}>
                          {d.product[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={a.aiTool} hint={a.detectedOnSystem}>
                    <Select
                      value={profile?.tool}
                      onValueChange={(value) =>
                        updateProfile({ tool: value as AgentProfile['tool'], effort: 'default' })
                      }
                    >
                      <SelectTrigger aria-label={a.aiTool} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['claude', 'codex', 'opencode', 'agy', 'grok'] as const).map((tool) => (
                          <SelectItem key={tool} value={tool}>
                            {tool}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={a.model} hint={a.toolDefault}>
                    <Input
                      aria-label={a.model}
                      value={profile?.model ?? ''}
                      placeholder={a.toolDefault}
                      onChange={(event) => updateProfile({ model: event.target.value })}
                    />
                  </Field>
                  <Field label={a.reasoningLevel} hint={a.supportedByTool}>
                    <Select
                      value={profile?.effort}
                      onValueChange={(value) => updateProfile({ effort: value })}
                    >
                      <SelectTrigger aria-label={a.reasoningLevel} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {effortOptions(profile?.tool ?? 'claude').map((effort) => (
                          <SelectItem key={effort} value={effort}>
                            {effort}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <Field label={a.additionalInstructions}>
                <Textarea
                  aria-label={a.additionalInstructions}
                  value={profile?.instructions ?? ''}
                  onChange={(event) => updateProfile({ instructions: event.target.value })}
                  rows={4}
                />
              </Field>
              <section
                role="group"
                aria-label={a.agentSkills}
                className="space-y-3 rounded-md border border-border p-4"
              >
                <div>
                  <h2 className="text-sm font-medium">{a.agentSkills}</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeSkills.length} of {catalogSkills.length} {a.activeSkills}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalogSkills.map((skill) => (
                    <label key={skill} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        aria-label={skill}
                        checked={activeSkills.includes(skill)}
                        onCheckedChange={(checked) =>
                          updateProfile({
                            skills: checked
                              ? [...activeSkills, skill]
                              : activeSkills.filter((item) => item !== skill),
                          })
                        }
                      />
                      {skill}
                    </label>
                  ))}
                </div>
              </section>
              <section className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <h2 className="text-sm font-medium">{a.autoInvoke}</h2>
                  <p className="text-xs text-muted-foreground">{a.autoInvokeDescription}</p>
                </div>
                <Switch
                  aria-label={a.autoInvoke}
                  checked={profile?.autoInvoke ?? false}
                  onCheckedChange={(checked) => updateProfile({ autoInvoke: checked })}
                />
              </section>
            </TabsContent>
            <TabsContent value="general" className="mt-5 space-y-5">
              <Field label={a.skillsFolder}>
                <div className="flex gap-2">
                  <Input
                    aria-label={a.skillsFolder}
                    value={draft.general?.skillsRoot ?? ''}
                    onChange={(event) => {
                      setEdited(true)
                      setDraft({
                        ...draft,
                        general: { ...draft.general!, skillsRoot: event.target.value },
                      })
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshSkills(draft.general?.skillsRoot)}
                  >
                    <RefreshCw />
                    {a.refresh}
                  </Button>
                </div>
              </Field>
              <Field label={a.interruptPolicy}>
                <Select
                  value={draft.general?.interruptPolicy}
                  onValueChange={(value) => {
                    setEdited(true)
                    setDraft({
                      ...draft,
                      general: {
                        ...draft.general!,
                        interruptPolicy: value as 'interrupt' | 'queue',
                      },
                    })
                  }}
                >
                  <SelectTrigger aria-label={a.interruptPolicy} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interrupt">{a.interruptRunning}</SelectItem>
                    <SelectItem value="queue">{a.queueReplies}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={a.guidedMode}>
                  <Input aria-label={a.guidedMode} value={a.correctionRounds} readOnly />
                </Field>
                <Field label={a.inactivityMinutes}>
                  <Input
                    aria-label={a.inactivityMinutes}
                    type="number"
                    min={1}
                    max={120}
                    value={draft.general?.inactivityMinutes ?? 30}
                    aria-invalid={Boolean(inactivityMessage)}
                    onChange={(event) => {
                      setEdited(true)
                      setDraft({
                        ...draft,
                        general: {
                          ...draft.general!,
                          inactivityMinutes: Number(event.target.value),
                        },
                      })
                    }}
                  />
                  {inactivityMessage ? (
                    <span className="text-xs text-destructive">{inactivityMessage}</span>
                  ) : null}
                </Field>
              </div>
            </TabsContent>
            <TabsContent value="connectors" className="mt-5 space-y-3">
              <h2 className="text-sm font-medium">Connectors</h2>
              {connectors.map((connector) => (
                <label
                  key={connector.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <span>
                    <strong>{connector.name}</strong>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {connector.transport} · {connector.status}
                    </span>
                  </span>
                  <Switch
                    aria-label={connector.name}
                    checked={connector.enabled}
                    onCheckedChange={(enabled) =>
                      setConnectors((items) =>
                        items.map((item) =>
                          item.id === connector.id ? { ...item, enabled } : item,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </TabsContent>
          </Tabs>
        ) : (
          <p role="status">{a.loading}</p>
        )}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <span role="status" className="text-xs text-muted-foreground">
            {saved && !dirty ? a.savedChanges : ''}
          </span>
          <Button disabled={!dirty || Boolean(inactivityMessage)} onClick={() => void save()}>
            {dirty ? <Check /> : null}
            {a.saveChanges}
          </Button>
        </div>
      </div>
      <UnsavedDialog
        open={pending !== null}
        title={a.unsavedChanges}
        description={a.unsavedDescription}
        saveLabel={a.saveChanges}
        discardLabel={a.discard}
        cancelLabel={a.cancel}
        onSave={() => void save()}
        onDiscard={() => {
          void (async () => {
            if (saved?.general?.skillsRoot !== lastScannedRoot.current)
              await refreshSkills(saved?.general?.skillsRoot)
            setDraft(structuredClone(saved))
            setEdited(false)
            const action = pending
            setPending(null)
            action?.()
          })()
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
