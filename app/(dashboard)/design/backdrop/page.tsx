import { notFound } from 'next/navigation'

import { BackdropLab } from '@/components/design/backdrop-lab'
import { getUserProfile } from '@/lib/auth'
import { firstName } from '@/lib/user-name'

// A bench for tuning the home backdrop, and only that. It sits inside the
// dashboard group so it inherits the real shell, the real card, the real
// tokens: a mock of the hero somewhere else would be tuned against the wrong
// surface and every number would come out slightly wrong.
//
// Dev only. Not linked from anywhere, and 404s on the deployed site, because
// a tool that ships becomes a surface nobody meant to support. Delete the
// route once the numbers are settled.
export default async function BackdropLabPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const { profile } = await getUserProfile()
  return <BackdropLab name={firstName(profile?.display_name)} />
}
