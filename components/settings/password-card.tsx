import { updatePassword } from '@/app/actions/auth'
import { SubmitButton } from '@/components/auth/submit-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Change the password from inside a signed-in session. Same action as the
// reset page; `from` routes its errors and its success message back here.
// Server component on purpose: a form and an action, no client JavaScript.
export function PasswordCard({
  error,
  message,
}: {
  error?: string
  message?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Pick a new one. You stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updatePassword} className="flex flex-col gap-4">
          <input type="hidden" name="from" value="settings" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Type it again</Label>
            <Input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <div>
            <SubmitButton label="Change password" pendingLabel="Changing" className="" />
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
