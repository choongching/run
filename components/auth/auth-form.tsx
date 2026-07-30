import Image from 'next/image'
import Link from 'next/link'
import { login, register } from '@/app/actions/auth'
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
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Image src="/run-icon.png" alt="Run" width={40} height={40} className="mx-auto mb-2" />
        <CardTitle className="text-xl">
          {isLogin ? 'Sign in to Run' : 'Create your Run account'}
        </CardTitle>
        <CardDescription>
          {isLogin
            ? 'Brief your AI squad and get work done.'
            : 'Join your company workspace.'}
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
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
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
  )
}
