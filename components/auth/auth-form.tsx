import Image from 'next/image'
import Link from 'next/link'
import { login, register } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
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
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <Button type="submit" className="w-full">
            {isLogin ? 'Sign in' : 'Create account'}
          </Button>
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
