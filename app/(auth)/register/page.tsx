import { AuthForm } from '@/components/auth/auth-form'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6 max-md:bg-background max-md:px-4">
      <AuthForm mode="register" error={error} />
    </div>
  )
}
