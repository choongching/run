import Image from 'next/image'

import { PromptComposer } from '@/components/home/prompt-composer'
import { getUserProfile } from '@/lib/auth'

// The prompt-first home: one question, one box, a few seeds. Submitting
// creates an agent and opens its chat. Replaces the old redirect to /runs.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  await getUserProfile()
  const { error } = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center py-16">
      <Image src="/run-icon.png" alt="" width={44} height={44} className="mb-6" />
      <h1 className="mb-8 text-2xl font-semibold">
        What should your agent do?
      </h1>

      {error && (
        <p className="mb-4 w-full rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <PromptComposer />
    </div>
  )
}
