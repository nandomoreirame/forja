import { useEffect } from 'react'
import { Composer } from '@/widgets/conversation'
import { getDictionary } from '@/shared/i18n'
import { roleIds, type RoleId } from '@/renderer/src/shared/api'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { mentionedRoles } from './recipient'

export function ComposerController({ featureId }: { featureId: string }) {
  const state = useWorkbench((s) => s)
  const prompt = state.drafts[featureId] ?? ''
  const feature = state.snapshot?.features.find((item) => item.id === featureId)
  const d = getDictionary(state.source.locale)
  const a = d.app
  const pendingFocus = state.composerFocusPending
  const consumeFocus = state.consumeComposerFocus
  useEffect(() => {
    if (pendingFocus) consumeFocus()
  }, [pendingFocus, consumeFocus])
  if (!feature) return null
  return (
    <Composer
      focusKey={state.composeActivation}
      autoFocus={pendingFocus}
      recipients={roleIds.map((id) => ({ id, label: d.product[id] }))}
      recipientId={state.recipients[featureId] ?? feature.stage}
      onRecipientChange={(id) => {
        if (roleIds.includes(id as RoleId)) state.setRecipient(featureId, id as RoleId)
      }}
      featureLabel={feature.name}
      targetLabel={state.snapshot?.project.path ?? ''}
      targetPrefix={a.destination}
      value={prompt}
      onChange={(value) => {
        const mentions = mentionedRoles(value)
        const previousMentions = mentionedRoles(prompt)
        if (
          mentions.length >= previousMentions.length &&
          mentions.join() !== previousMentions.join()
        ) {
          const role = mentions.at(-1)
          if (role) state.setRecipient(featureId, role)
        }
        state.setDraft(featureId, value)
      }}
      onSend={() => {
        state.sendMessage(featureId, prompt)
        state.setDraft(featureId, '')
      }}
      placeholder={a.prompt}
      recipientLabel={a.recipient}
      contextLabel={a.context}
      sendLabel={a.send}
      shortcutHint={a.shortcutHint}
    />
  )
}
