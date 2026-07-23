import Link from 'next/link'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AgentForm } from '@/components/agents/agent-form'

export default async function NewAgentPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_context')
    .limit(1)
    .single()

  return (
    <>
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin/agents" />}>
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
          Define the agent&apos;s role, model, and system prompt
        </p>
      </div>
      <AgentForm
        mode="create"
        hasCompanyContext={Boolean(settings?.company_context?.trim())}
      />
    </>
  )
}
