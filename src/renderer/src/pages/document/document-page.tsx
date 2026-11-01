import { useWorkbench } from '@/renderer/src/entities/feature'
import { WorkbenchTabs } from '@/renderer/src/widgets/workbench-tabs'
import { DocumentPreview, MarkdownPreview } from '@/widgets/documents'
import { getDictionary } from '@/shared/i18n'

export function DocumentPage() {
  const state = useWorkbench((s) => s)
  const artifact = state.snapshot?.artifacts.find(
    (item) => state.view.kind === 'document' && item.id === state.view.documentId,
  )
  const d = getDictionary(state.source.locale)
  const t = d.app.document
  if (!artifact) return null
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
            <MarkdownPreview
              source={state.documents[artifact.id] ?? ''}
              tooLargeLabel={t.tooLarge}
              diagramErrorLabel={t.diagramError}
              diagramLoadingLabel={t.diagramLoading}
            />
          </DocumentPreview>
        </div>
      </div>
    </section>
  )
}
