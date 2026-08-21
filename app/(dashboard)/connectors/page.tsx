import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'
import { ConnectorsManager } from '@/components/connectors/connectors-manager'
import { getUserIdentity } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getUserConnection } from '@/lib/pipedream/connections'
import { getSearchAllowance } from '@/lib/entitlements/assert'
import { isTelegramConfigured } from '@/lib/telegram/client'

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

  // Telegram rides along in the same round trip rather than being fetched by
  // the row on mount: fetching it client side would flash "not connected" at
  // someone who is, on the one page whose whole job is saying what is linked.
  const [gmail, drive, jina, searches, telegram, sending] = await Promise.all([
    getUserConnection(supabase, userId, 'gmail'),
    getUserConnection(supabase, userId, 'google_drive'),
    getUserConnection(supabase, userId, 'jina_ai'),
    getSearchAllowance(supabase, userId),
    supabase
      .from('user_telegram')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('routines')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deliver_telegram', true),
  ])

  // The subtitle names the page's groups, so it has to lose its second clause
  // on a deployment with no bot: otherwise it promises somewhere for reports
  // to reach you and the page has nowhere to point.
  const delivery = isTelegramConfigured()

  return (
    <PageShell>
      <PageHeader
        title="Connectors"
        description={
          delivery
            ? 'What your agents can use, and where your reports reach you.'
            : 'What your agents can use.'
        }
      />
      <ConnectorsManager
        connections={{
          gmail: Boolean(gmail),
          google_drive: Boolean(drive),
          jina_ai: Boolean(jina),
        }}
        searches={searches}
        telegram={
          delivery
            ? {
                paired: Boolean(telegram.data),
                sendingCount: sending.count ?? 0,
              }
            : null
        }
      />
    </PageShell>
  )
}
