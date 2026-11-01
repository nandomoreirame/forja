import { Composer } from '@/widgets/conversation'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { mentionedAgent } from '@/renderer/src/features/composer/recipient'
/** Composer of one New chat tab; its prompt lives in the store per tab. */
export function FeatureComposer({ id, autoFocus = false }: { id: string; autoFocus?: boolean }) {
  const state = useWorkbench((s) => s)
  const activation = state.composeActivation
  const tab = state.composeTabs.find((item) => item.id === id)
  if (!tab) return null
  const { prompt } = tab
  const a = getDictionary(state.source.locale).app
  return (
    <Composer
      autoFocus={autoFocus}
      focusKey={activation}
      featureLabel={a.newContext}
      targetLabel={state.snapshot?.project.path ?? ''}
      targetPrefix={a.destination}
      value={prompt}
      onChange={(value) => state.setComposeDraft(tab.id, { prompt: value })}
      onSend={() => {
        // A New chat opens with the Ferreiro (or the tab's agent) unless the prompt mentions one.
        state.createFeatureFromPrompt(prompt, mentionedAgent(prompt, state.agentNames) ?? tab.role)
      }}
      placeholder={a.prompt}
      contextLabel={a.context}
      sendLabel={a.send}
      shortcutHint={a.shortcutHint}
    />
  )
}
