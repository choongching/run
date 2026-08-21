import { getUserProfile } from '@/lib/auth'
import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'
import { PasswordCard } from '@/components/settings/password-card'
import { ProfileForm } from '@/components/settings/profile-form'
import { SignOutCard } from '@/components/settings/sign-out-card'

// Everything about the person rather than their agents: who they are, and
// leaving. Reached from the avatar menu in the sidebar, which is where people
// look for their own account, rather than from a nav item sitting beside
// Knowledge and Connectors, which are things the agents use.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const [{ email, profile }, { error, message }] = await Promise.all([
    getUserProfile(),
    searchParams,
  ])

  return (
    <PageShell>
      <PageHeader title="Settings" description="Your account" />
      <div className="flex flex-col gap-5">
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ''}
          email={email}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <PasswordCard error={error} message={message} />
        <SignOutCard email={email} />
      </div>
    </PageShell>
  )
}
