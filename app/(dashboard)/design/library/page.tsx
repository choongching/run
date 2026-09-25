import { notFound } from 'next/navigation'

import { LibraryBody } from '@/components/design/library'
import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'

// The living library: every primitive and recipe the app is built from,
// rendered live in every state, on one page. The styleguide describes what is
// built; this page is the proof, so when the two disagree one of them is a
// bug and this page is where you notice.
//
// Dev only, unlinked, same guard as the old backdrop bench: a component
// catalogue is a workbench, not a product surface.
export default function DesignLibraryPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <PageShell>
      <PageHeader
        title="Library"
        description="Every piece the app is built from, in every state."
      />
      <LibraryBody />
    </PageShell>
  )
}
