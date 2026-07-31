import Image from 'next/image'

import { updatePassword } from '@/app/actions/auth'
import { PasswordInput } from '@/components/auth/password-input'
import { SubmitButton } from '@/components/auth/submit-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6 max-md:bg-background max-md:px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/run-icon.png" alt="Run" width={40} height={40} className="mx-auto mb-2" />
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>You are signed in. Pick the new one.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
