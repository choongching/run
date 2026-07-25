import Link from 'next/link'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AgentWizard } from '@/components/agents/builder/agent-wizard'

export default async function NewAgentPage() {
  await getUserProfile()
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_context, pipedream_account_id, pipedream_connected_by')
    .limit(1)
    .single()

  return (
    <>
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/agents" />}>
                Agents
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New agent</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-2 text-2xl font-semibold">New agent</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          An agent is a helper you set up once with instructions, files, and
          tools, then put to work whenever you need it.
        </p>
      </div>
      <AgentWizard
        hasCompanyContext={Boolean(settings?.company_context?.trim())}
        driveConnected={Boolean(
          settings?.pipedream_account_id && settings.pipedream_connected_by
        )}
      />
    </>
  )
}
