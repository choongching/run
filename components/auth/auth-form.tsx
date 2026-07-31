import Image from 'next/image'
import Link from 'next/link'
import { login, register } from '@/app/actions/auth'
import { PasswordInput } from '@/components/auth/password-input'
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

type AuthFormProps = {
  mode: 'login' | 'register'
  error?: string
  message?: string
}

export function AuthForm({ mode, error, message }: AuthFormProps) {
  const isLogin = mode === 'login'
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <Image src="/run-icon.png" alt="Run" width={40} height={40} className="mx-auto mb-2" />
        <CardTitle className="text-xl">
          {/* A person's greeting, not a system's label. The button below
              already says Sign in, so the title is free to be warm. */}
          {isLogin ? 'Welcome back' : 'Create your Run account'}
        </CardTitle>
        <CardDescription>
          {/* The doors are a matched pair, both ending on the product's
              name as a verb. Login greets, register claims. */}
          {isLogin
            ? 'Your agents are ready to run.'
            : 'Describe the job. Watch it run.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={isLogin ? login : register} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="display_name">Name</Label>
              <Input id="display_name" name="display_name" placeholder="Your name" />
            </div>
          )}
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {isLogin && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? undefined : 8}
            />
            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                At least 8 characters.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <SubmitButton
            label={isLogin ? 'Sign in' : 'Create account'}
            pendingLabel={isLogin ? 'Signing in' : 'Creating your account'}
          />
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                No account?{' '}
                <Link href="/register" className="text-foreground underline underline-offset-4">
                  Register
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/login" className="text-foreground underline underline-offset-4">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
      {/* The maker's mark: quiet, outside the card, present on both doors. */}
      <p className="text-xs text-muted-foreground/70">
        Designed and built by CC Teo
      </p>
    </div>
  )
}
