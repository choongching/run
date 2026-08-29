import Link from 'next/link'
import { login, register } from '@/app/actions/auth'
import { PasswordInput } from '@/components/auth/password-input'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthFormProps = {
  mode: 'login' | 'register'
  error?: string
  message?: string
  // An address already typed somewhere else (the front page's bar), so the
  // person does not type it twice. Only ever a pre-fill, never trusted.
  email?: string
}

// The form on its own, no card around it: the AuthShell it sits in is the
// frame now, and a box inside the column read as a frame within a frame.
export function AuthForm({ mode, error, message, email }: AuthFormProps) {
  const isLogin = mode === 'login'
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">
          {/* A person's greeting, not a system's label. The button below
              already says Sign in, so the title is free to be warm. */}
          {isLogin ? 'Welcome back' : 'Create your Run account'}
        </h1>
        <p className="text-base text-muted-foreground">
          {/* The doors are a matched pair, both ending on the product's
              name as a verb. Login greets, register claims. */}
          {isLogin
            ? 'Your agents are ready to run.'
            : 'Describe the job. Watch it run.'}
        </p>
      </div>
      <form action={isLogin ? login : register} className="flex flex-col gap-4">
        {!isLogin && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="display_name">Name</Label>
            {/* Required: your agents say hello by name, so an account
                without one starts colder than it needs to. */}
            <Input
              id="display_name"
              name="display_name"
              placeholder="Your name"
              maxLength={80}
              autoComplete="name"
              required
            />
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
            defaultValue={email}
            autoFocus={!email}
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
    </div>
  )
}
