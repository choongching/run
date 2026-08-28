import type { Metadata } from 'next'
import Link from 'next/link'

import { requestReset } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth/auth-shell'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const metadata: Metadata = {
  title: 'Reset your password',
  description:
    'Type the email you sign in with and Run sends you a link to set a new password.',
  alternates: { canonical: '/forgot-password' },
  openGraph: { title: 'Reset your password · Run', description: 'Type the email you sign in with and Run sends you a link to set a new password.', url: '/forgot-password', images: ['/og.png'] },
}

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
    <AuthShell showcase="still">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-base text-muted-foreground">
            Type the email you sign in with and we will send you a link.
          </p>
        </div>
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
      </div>
    </AuthShell>
  )
}
