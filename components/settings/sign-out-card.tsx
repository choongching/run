import { LogOut } from 'lucide-react'

import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Signing out lives with the rest of the account rather than as a permanent
// row in the sidebar. The avatar menu still offers it, because that is the
// habit people arrive with; this is the same action in the place someone
// looks when they go hunting through their settings for it.
export function SignOutCard({ email }: { email: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Sign out</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ends this session on this device. You are signed in as {email}.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut data-icon="inline-start" />
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
