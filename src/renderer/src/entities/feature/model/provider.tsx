import { createContext, useContext, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { WorkbenchState, WorkbenchStore } from './store'
const Context = createContext<WorkbenchStore | null>(null)
export function WorkbenchProvider({
  store,
  children,
}: {
  store: WorkbenchStore
  children: ReactNode
}) {
  return <Context.Provider value={store}>{children}</Context.Provider>
}
export function useWorkbench<T>(selector: (state: WorkbenchState) => T): T {
  const store = useContext(Context)
  if (!store) throw new Error('WorkbenchProvider required')
  return useStore(store, selector)
}
