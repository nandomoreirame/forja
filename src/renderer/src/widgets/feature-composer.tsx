import { useState, useEffect } from 'react'
import { Composer } from '@/widgets/conversation'
import { getDictionary } from '@/shared/i18n'
import type { RoleId } from '@/renderer/src/shared/api'
import { roleIds } from '@/renderer/src/shared/api'
import { useWorkbench } from '@/renderer/src/entities/feature'
export function FeatureComposer({
  role,
  featureId,
  autoFocus = false,
}: {
  role: RoleId
  featureId?: string
  autoFocus?: boolean
}) {
  const state = useWorkbench((s) => s)
  const activation = state.composeActivation
  const [prompt, setPrompt] = useState('')
  const [recipient, setRecipient] = useState(role)
  useEffect(() => {
    setRecipient(role)
  }, [role, activation])
  const d = getDictionary(state.source.locale)
  const a = d.app
  const feature = state.snapshot?.features.find((f) => f.id === featureId)
  return (
    <Composer
      autoFocus={autoFocus}
      focusKey={activation}
      recipients={roleIds.map((id) => ({ id, label: d.product[id] }))}
      recipientId={recipient}
      onRecipientChange={(id) => {
        if (roleIds.includes(id as RoleId)) {
          setRecipient(id as RoleId)
          if (featureId) state.setRecipient(featureId, id as RoleId)
        }
      }}
      featureLabel={feature?.name ?? a.newContext}
      targetLabel={state.snapshot?.project.path ?? ''}
      targetPrefix={a.destination}
      value={prompt}
      onChange={setPrompt}
      onSend={() => {
        if (featureId) state.sendMessage(featureId, prompt)
        else state.createFeatureFromPrompt(prompt, recipient)
        setPrompt('')
      }}
      placeholder={a.prompt}
      recipientLabel={a.recipient}
      contextLabel={a.context}
      sendLabel={a.send}
      shortcutHint={a.shortcutHint}
    />
  )
}
