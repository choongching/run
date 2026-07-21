import { AuthForm } from '@/components/auth/auth-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <AuthForm mode="login" error={error} message={message} />
    </div>
  )
}
