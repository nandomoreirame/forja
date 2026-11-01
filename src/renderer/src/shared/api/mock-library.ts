export interface MockLibrary {
  documents: {
    slug: string
    kind: 'spec' | 'plan'
    name: string
    markdown: string
    state: 'approved' | 'draft'
  }[]
}
