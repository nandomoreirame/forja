import { useWorkbench } from '@/renderer/src/entities/feature'
import { WorkbenchTabs } from '@/renderer/src/widgets/workbench-tabs'
import { DocumentPreview, MarkdownPreview } from '@/widgets/documents'
import { getDictionary } from '@/shared/i18n'
import { DocumentSelection } from '@/renderer/src/features/document-reader'
import { ComposerController } from '@/renderer/src/features/composer'

export function DocumentPage() {
  const state = useWorkbench((s) => s)
  const artifact = state.snapshot?.artifacts.find(
    (item) => state.view.kind === 'document' && item.id === state.view.documentId,
  )
  const d = getDictionary(state.source.locale)
  const t = d.app.document
  if (!artifact) return null
  const feature = state.snapshot?.features.find((item) => artifact.name.startsWith(`${item.slug}/`))
  const canApprove = artifact.state === 'draft' && artifact.kind !== 'review'
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <WorkbenchTabs />
      <div
        role="tabpanel"
        id={`document-panel-${artifact.id}`}
        aria-labelledby={`feature-tab-${artifact.id}`}
        className="min-h-0 flex-1 overflow-y-auto p-6"
      >
        <div className="mx-auto w-full max-w-[760px]">
          <DocumentPreview
            name={artifact.name}
            state={artifact.state}
            stateLabel={d.app.states[artifact.state]}
            actionLabel={
              canApprove ? (artifact.kind === 'plan' ? t.approvePlan : t.approveSpec) : undefined
            }
            onAction={canApprove ? () => state.approveDocument(artifact.id) : undefined}
            notice={
              canApprove
                ? t.approvalNotice
                : artifact.state === 'approved'
                  ? t.approvedNotice
                  : undefined
            }
          >
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
              <MarkdownPreview
                source={state.documents[artifact.id] ?? ''}
                tooLargeLabel={t.tooLarge}
                diagramErrorLabel={t.diagramError}
                diagramLoadingLabel={t.diagramLoading}
              />
            </DocumentSelection>
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
