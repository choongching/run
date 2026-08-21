import { updatePassword } from '@/app/actions/auth'
import { PasswordInput } from '@/components/auth/password-input'
import { SectionCard } from '@/components/section-card'
import { SubmitButton } from '@/components/auth/submit-button'
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
    <SectionCard
      title="Password"
      description="Pick a new one. You stay signed in on this device."
    >
        <form action={updatePassword} className="flex flex-col gap-4">
          <input type="hidden" name="from" value="settings" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Type it again</Label>
            <PasswordInput
              id="confirm-password"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <div>
            <SubmitButton label="Change password" pendingLabel="Changing" className="" />
          </div>
        </form>
    </SectionCard>
  )
}
