import { useState } from 'react'
import { Button, Textarea, StatusBadge } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { WorkbenchTabs } from '@/renderer/src/widgets/workbench-tabs'
import { DocumentPreview, MarkdownPreview } from '@/widgets/documents'
import { getDictionary } from '@/shared/i18n'
import { DocumentSelection } from '@/renderer/src/features/document-reader'
import { ComposerController } from '@/renderer/src/features/composer'

// Matches the per-file cap of the mock library so real specs and plans render in full.
const documentPreviewLimit = 200_000

export function DocumentPage() {
  const state = useWorkbench((s) => s)
  const artifact = state.snapshot?.artifacts.find(
    (item) => state.view.kind === 'document' && item.id === state.view.documentId,
  )
  const d = getDictionary(state.source.locale)
  const t = d.app.document
  const library =
    state.view.kind === 'document' ? state.libraryDocuments[state.view.documentId] : undefined
  if (library)
    return (
      <section className="flex min-h-0 flex-1 flex-col">
        <WorkbenchTabs />
        <div
          role="tabpanel"
          id={`document-panel-${library.id}`}
          aria-labelledby={`feature-tab-${library.id}`}
          className="min-h-0 flex-1 overflow-y-auto p-6"
        >
          <div className="w-full space-y-4">
            <header className="flex items-center gap-3 rounded-md border border-border p-3">
              <h1 className="min-w-0 flex-1 truncate font-mono text-sm">{library.name}</h1>
              <StatusBadge size="sm" state="draft">
                {library.scope === 'project' ? d.app.projectScopeLabel : d.app.globalScopeLabel}
              </StatusBadge>
              <Button
                size="sm"
                onClick={() => state.startAuthoring(library.kind, library.scope, library.name)}
              >
                {d.app.editWithAgent}
              </Button>
            </header>
            <MarkdownPreview
              source={state.documents[library.id] ?? ''}
              maxLength={documentPreviewLimit}
              tooLargeLabel={t.tooLarge}
              diagramErrorLabel={t.diagramError}
              diagramLoadingLabel={t.diagramLoading}
            />
          </div>
        </div>
      </section>
    )
  if (!artifact) return null
  const feature = state.snapshot?.features.find(
    (item) => item.id === artifact.featureId && !item.archived,
  )
  const canApprove = artifact.state === 'draft' && artifact.kind !== 'review'
  const preview = (
    <MarkdownPreview
      source={state.documents[artifact.id] ?? ''}
      maxLength={documentPreviewLimit}
      tooLargeLabel={t.tooLarge}
      diagramErrorLabel={t.diagramError}
      diagramLoadingLabel={t.diagramLoading}
    />
  )
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <WorkbenchTabs />
      <div
        role="tabpanel"
        id={`document-panel-${artifact.id}`}
        aria-labelledby={`feature-tab-${artifact.id}`}
        className="min-h-0 flex-1 overflow-y-auto p-6"
      >
        <div className="w-full">
          <DocumentPreview
            name={artifact.name}
            actionLabel={
              canApprove ? (artifact.kind === 'plan' ? t.approvePlan : t.approveSpec) : undefined
            }
            onAction={canApprove ? () => state.approveDocument(artifact.id) : undefined}
            notice={canApprove ? t.approvalNotice : undefined}
          >
            {feature ? (
              <DocumentSelection
                key={artifact.id}
                label={t.reviewWithAgent}
                onReview={(excerpt) => {
                  if (feature)
                    state.prefillDraft(feature.id, {
                      recipient: artifact.author,
                      text: `${t.reviewPrefix} ${artifact.name}:\n${excerpt
                        .split('\n')
                        .map((line) => `> ${line}`)
                        .join('\n')}`,
                    })
                }}
              >
                {preview}
              </DocumentSelection>
            ) : (
              preview
            )}
          </DocumentPreview>
        </div>
      </div>
      {feature ? (
        <div className="shrink-0 p-4">
          <ComposerController featureId={feature.id} />
        </div>
      ) : null}
    </section>
  )
}

export function AuthoringPage() {
  const state = useWorkbench((s) => s)
  const [draft, setDraft] = useState('')
  const a = getDictionary(state.source.locale).app
  const conversation = state.authoring
  if (!conversation) return null
  const recipient = conversation.kind === 'skill' ? a.skillAuthor : a.memoryCurator
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <WorkbenchTabs />
      <div className="flex w-full flex-1 flex-col gap-4 overflow-auto p-6">
        <header>
          <h1 className="text-lg font-semibold">{recipient}</h1>
          <p>{conversation.name}</p>
          <StatusBadge size="sm" state="draft">
            {conversation.scope === 'project' ? a.projectScopeLabel : a.globalScopeLabel}
          </StatusBadge>
        </header>
        <div role="log" aria-label={recipient} className="flex-1 space-y-3">
          {conversation.messages.map((message, index) => (
            <MarkdownPreview key={index} source={message} />
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            state.sendAuthoring(draft)
            setDraft('')
          }}
          className="space-y-2"
        >
          <Textarea
            aria-label={a.authoringPrompt}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" disabled={conversation.running || !draft.trim()}>
            {a.send}
          </Button>
        </form>
      </div>
    </section>
  )
}
