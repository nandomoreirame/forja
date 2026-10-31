import { useWorkbench } from '@/renderer/src/entities/feature'
import { FeatureComposer } from '@/renderer/src/widgets/feature-composer'
export function ComposePage() {
  const view = useWorkbench((s) => s.view)
  if (view.kind !== 'compose') return null
  return (
    <section className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 items-center justify-center p-6">
      <div className="w-full">
        <FeatureComposer key={view.role} role={view.role} autoFocus />
      </div>
    </section>
  )
}
