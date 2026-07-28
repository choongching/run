import { getUserProfile } from '@/lib/auth'
import { PageHeader } from '@/components/page-header'
import { ProfileForm } from '@/components/settings/profile-form'
import { SignOutCard } from '@/components/settings/sign-out-card'

// Everything about the person rather than their agents: who they are, and
// leaving. Reached from the avatar menu in the sidebar, which is where people
// look for their own account, rather than from a nav item sitting beside
// Knowledge and Connectors, which are things the agents use.
export default async function SettingsPage() {
  const { email, profile } = await getUserProfile()

  return (
    <>
      <PageHeader title="Settings" description="Your account" />
      <div className="flex max-w-xl flex-col gap-4">
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ''}
          email={email}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <SignOutCard email={email} />
      </div>
    </>
  )
}
