import { useEffect } from 'react'
import { Composer } from '@/widgets/conversation'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { mentionedAgent } from './recipient'

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
      featureLabel={feature.name}
      targetLabel={state.snapshot?.project.path ?? ''}
      targetPrefix={a.destination}
      value={prompt}
      onChange={(value) => state.setDraft(featureId, value)}
      onSend={() => {
        // Without an @ mention the agent of the chat phase answers.
        state.sendMessage(featureId, prompt, mentionedAgent(prompt, state.agentNames) ?? undefined)
        state.setDraft(featureId, '')
      }}
      placeholder={a.prompt}
      contextLabel={a.context}
      sendLabel={a.send}
      shortcutHint={a.shortcutHint}
    />
  )
}
