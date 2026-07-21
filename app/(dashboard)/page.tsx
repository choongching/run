import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/auth'

export default async function HomePage() {
  const { profile } = await getUserProfile()
  redirect(profile?.role === 'admin' ? '/admin/agents' : '/missions')
}
