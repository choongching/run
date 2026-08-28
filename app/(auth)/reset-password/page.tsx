import { updatePassword } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordInput } from '@/components/auth/password-input'
import { SubmitButton } from '@/components/auth/submit-button'
import { Label } from '@/components/ui/label'

// Where the email link ends up, already signed in by /auth/confirm. A cold
// visit with no session never reaches here; the proxy sends it to /login.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <AuthShell showcase="still">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-base text-muted-foreground">You are signed in. Pick the new one.</p>
        </div>
        <form action={updatePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              autoFocus
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Type it again</Label>
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SubmitButton label="Save and sign in" pendingLabel="Saving" />
        </form>
      </div>
    </AuthShell>
  )
}
