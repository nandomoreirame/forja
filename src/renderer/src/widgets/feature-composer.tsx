import { useState } from 'react'
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
  const [prompt, setPrompt] = useState('')
  const [recipient, setRecipient] = useState(role)
  const d = getDictionary(state.source.locale)
  const a = d.app
  const feature = state.snapshot?.features.find((f) => f.id === featureId)
  return (
    <Composer
      autoFocus={autoFocus}
      recipients={roleIds.map((id) => ({ id, label: d.product[id] }))}
      recipientId={recipient}
      onRecipientChange={(id) => {
        if (roleIds.includes(id as RoleId)) setRecipient(id as RoleId)
      }}
      featureLabel={feature?.name ?? a.newContext}
      targetLabel={state.snapshot?.project.path ?? ''}
      targetPrefix={a.destination}
      value={prompt}
      onChange={setPrompt}
      onSend={() => {
        if (featureId) state.appendPrompt(featureId, prompt, recipient)
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
