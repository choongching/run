import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { MissionDetail } from '@/components/missions/mission-detail'
import type { MissionWithAgent } from '@/components/missions/mission-status'

export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await getUserProfile()
  const { id } = await params
  const supabase = await createClient()

  // Owner-only: the board is personal, so the detail page is too (admins
  // read other users' missions via the database, not this page).
  const { data: mission } = await supabase
    .from('missions')
    .select('*, agents(name)')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!mission) notFound()

  return (
    <>
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/missions" />}>
                Missions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{mission.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-2 text-2xl font-semibold">{mission.title}</h1>
      </div>
      <MissionDetail mission={mission as MissionWithAgent} />
    </>
  )
}
