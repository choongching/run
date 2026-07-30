import Image from 'next/image'
import Link from 'next/link'

import { requestReset } from '@/app/actions/auth'
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

// The way back in. Server-rendered, one form, one action; the sent state is a
// message in the URL rather than client state, so this page ships no extra
// JavaScript and cannot say whether an email has an account.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/run-icon.png" alt="Run" width={40} height={40} className="mx-auto mb-2" />
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            Type the email you sign in with and we will send you a link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <SubmitButton label="Send reset link" pendingLabel="Sending" />
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Back to sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
