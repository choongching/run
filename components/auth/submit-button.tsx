'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

// The sign-in button, with the waiting state the form never had.
//
// Signing in is genuinely slow and cannot be made fast: verifying a password
// is deliberately expensive, measured at 264 to 491ms before the redirect even
// starts. What made it FEEL broken was the button doing nothing at all for
// that time. This is the whole fix: press it and it answers immediately, stays
// pressed, and cannot be pressed twice.
export function SubmitButton({
  label,
  pendingLabel,
  className = 'w-full',
}: {
  label: string
  pendingLabel: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className={className} disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </Button>
  )
}
