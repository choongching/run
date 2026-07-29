import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'
import { ConnectorsManager } from '@/components/connectors/connectors-manager'
import { getUserIdentity } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getUserConnection } from '@/lib/pipedream/connections'

// Every connector this person has, in one place.
//
// A connector is account level: linking Gmail once serves every agent you own.
// Until now the only way to link one was from inside an agent, which put an
// account-level setting behind an agent-level door, and made a connector
// impossible to reach at all if you had no agent yet. Connecting from an agent
// still works, because that is where the need usually appears. This is the
// management half: see what is linked, link something before you need it, and
// disconnect without hunting through an agent.
export default async function ConnectorsPage() {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  const [gmail, drive] = await Promise.all([
    getUserConnection(supabase, userId, 'gmail'),
    getUserConnection(supabase, userId, 'google_drive'),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Connectors"
        description="What your agents can use."
      />
      <ConnectorsManager
        connections={{ gmail: Boolean(gmail), google_drive: Boolean(drive) }}
      />
    </PageShell>
  )
}
