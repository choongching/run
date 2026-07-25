import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/auth'

export default async function HomePage() {
  await getUserProfile()
  // One landing for everyone: the role split retired with phase 7.
  redirect('/runs')
}
