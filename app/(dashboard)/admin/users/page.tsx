import Link from 'next/link'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'

const AVATAR_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-5']

export default async function UsersPage() {
  await requireAdminPage()
  const supabase = await createClient()

  const [{ data: profiles }, { data: squads }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('user_agents').select('user_id'),
  ])

  const squadCounts = new Map<string, number>()
  for (const row of squads ?? []) {
    squadCounts.set(row.user_id, (squadCounts.get(row.user_id) ?? 0) + 1)
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage users and their agent assignments"
      />
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Squad</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile, i) => {
              const initials = (profile.display_name ?? '?')
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              const count = squadCounts.get(profile.id) ?? 0
              return (
                <tr
                  key={profile.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback
                          className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-xs font-medium text-white`}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {profile.display_name ?? 'Unnamed user'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                      {profile.role === 'admin' ? 'Administrator' : 'Member'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {count === 0 ? 'No agents' : `${count} agent${count === 1 ? '' : 's'}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${profile.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
