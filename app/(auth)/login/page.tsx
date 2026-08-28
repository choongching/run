import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to Run and put an agent on your inbox, your documents or your research. It reads and drafts in your real Gmail and Google Drive, and asks before it changes anything.',
  alternates: { canonical: '/login' },
  openGraph: { title: 'Sign in · Run', description: 'Sign in to Run and put an agent on your inbox, your documents or your research. It reads and drafts in your real Gmail and Google Drive, and asks before it changes anything.', url: '/login', images: ['/og.png'] },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  return (
    <AuthShell showcase="play">
      <AuthForm mode="login" error={error} message={message} />
    </AuthShell>
  )
}
