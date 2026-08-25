import { LogOut } from 'lucide-react'

import { logout } from '@/app/actions/auth'
import { Row, RowBox, RowTile, SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'

// Signing out lives with the rest of the account rather than as a permanent
// row in the sidebar. The avatar menu still offers it, because that is the
// habit people arrive with; this is the same action in the place someone
// looks when they go hunting through their settings for it.
export function SignOutCard({ email }: { email: string }) {
  return (
    <SectionCard
      title="This device"
    >
      {/* A row, not a form on a card: it is one thing about one device, which
          is what a row is for. */}
      <RowBox>
        <Row
          lead={
            <RowTile>
              <LogOut className="size-4" />
            </RowTile>
          }
          title={<>Signed in as {email}</>}
          detail="On this browser."
          trailing={
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm" className="run-tap">
                Sign out
              </Button>
            </form>
          }
        />
      </RowBox>
    </SectionCard>
  )
}
