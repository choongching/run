import { getUserProfile } from '@/lib/auth'
import { PageHeader } from '@/components/page-header'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function SettingsPage() {
  const { email, profile } = await getUserProfile()

  return (
    <>
      <PageHeader title="Settings" description="Manage your account" />
      <ProfileForm
        initialDisplayName={profile?.display_name ?? ''}
        email={email}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </>
  )
}
