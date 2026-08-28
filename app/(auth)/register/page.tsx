import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Create your account',
  description:
    'Create a Run account. Describe the job in a sentence and watch an agent do it in your real Gmail and Google Drive, asking before anything changes.',
  alternates: { canonical: '/register' },
  openGraph: { title: 'Create your account · Run', description: 'Create a Run account. Describe the job in a sentence and watch an agent do it in your real Gmail and Google Drive, asking before anything changes.', url: '/register', images: ['/og.png'] },
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <AuthShell showcase="play">
      <AuthForm mode="register" error={error} />
    </AuthShell>
  )
}
