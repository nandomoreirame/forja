import { Composer } from '@/widgets/conversation'
import { getDictionary } from '@/shared/i18n'
import { agentIds, agentName, useWorkbench } from '@/renderer/src/entities/feature'
/** Composer of one New chat tab; its agent and prompt live in the store per tab. */
export function FeatureComposer({ id, autoFocus = false }: { id: string; autoFocus?: boolean }) {
  const state = useWorkbench((s) => s)
  const activation = state.composeActivation
  const tab = state.composeTabs.find((item) => item.id === id)
  if (!tab) return null
  const { prompt, role: recipient } = tab
  const d = getDictionary(state.source.locale)
  const a = d.app
  return (
    <Composer
      autoFocus={autoFocus}
      focusKey={activation}
      recipients={agentIds.map((id) => ({
        id,
        label: agentName(id, state.source.locale, state.agentNames),
        roleLabel: d.product[id],
      }))}
      recipientId={recipient}
      onRecipientChange={(id) => {
        const role = agentIds.find((agent) => agent === id)
        if (role) state.setComposeDraft(tab.id, { role })
      }}
      featureLabel={a.newContext}
      targetLabel={state.snapshot?.project.path ?? ''}
      targetPrefix={a.destination}
      value={prompt}
      onChange={(value) => state.setComposeDraft(tab.id, { prompt: value })}
      onSend={() => {
        state.createFeatureFromPrompt(prompt, recipient)
      }}
      placeholder={a.prompt}
      recipientLabel={a.recipient}
      contextLabel={a.context}
      sendLabel={a.send}
      shortcutHint={a.shortcutHint}
    />
  )
}
