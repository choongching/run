'use client'

import { useEffect, useRef } from 'react'

// The one polling loop behind every "go and do this elsewhere, we will notice"
// flow: connecting Gmail or Drive in a popup, and pairing Telegram on a phone.
//
// Four call sites hand-rolled this. Two of them were wrong in the same way, so
// it is one shape now rather than four near-copies.
//
// Three things this gets right that a bare setInterval in a click handler does
// not:
//
//   1. IT STOPS ON UNMOUNT. The connector rows started their interval inside
//      the click and only ever cleared it from inside its own callback, so
//      navigating away mid-connect left it running for the full three minutes,
//      hitting the connections route every two seconds (up to 90 requests
//      against a route that calls Pipedream) and setting state on a component
//      that no longer existed.
//
//   2. IT RECHECKS THE MOMENT THE TAB COMES BACK. Every one of these flows
//      sends the person somewhere else: a popup, another tab, or their phone.
//      Chrome throttles setInterval in a hidden tab to roughly once a minute,
//      so "this updates itself" could sit there for up to a minute after the
//      person had already finished. Checking on visibilitychange makes coming
//      back to the tab feel instant no matter what the timer was doing.
//
//   3. IT DOES NOT STACK REQUESTS. The connections check calls Pipedream and
//      can take longer than the interval. A plain interval fires anyway and
//      the slow calls pile up; this skips a tick while one is still in flight.

type Options = {
  // Whether to be polling at all. Flipping this false stops everything.
  active: boolean
  // One attempt. Resolve true when the thing being waited for has happened.
  // Throwing is treated as "not yet", because these checks fail transiently.
  check: () => Promise<boolean>
  // Called once, when check first resolves true.
  onDone: () => void
  // Called once if the deadline passes first.
  onTimeout?: () => void
  intervalMs?: number
  timeoutMs?: number
}

export function useConnectPoll({
  active,
  check,
  onDone,
  onTimeout,
  intervalMs = 2500,
  timeoutMs = 5 * 60 * 1000,
}: Options) {
  // The callbacks are read through refs so a caller can pass inline arrows
  // without restarting the poll on every render. Only `active` restarts it.
  const checkRef = useRef(check)
  const doneRef = useRef(onDone)
  const timeoutRef = useRef(onTimeout)

  // Synced in an effect, never during render: writing a ref while rendering
  // trips react-hooks/refs, the same rule the styleguide records for reading
  // one. Declared BEFORE the poll effect so it has already run by the time the
  // poll reads a ref, and the useRef initializers cover the very first pass.
  useEffect(() => {
    checkRef.current = check
    doneRef.current = onDone
    timeoutRef.current = onTimeout
  })

  useEffect(() => {
    if (!active) return

    let stopped = false
    let inFlight = false
    const startedAt = Date.now()

    const finish = (fire: (() => void) | undefined) => {
      if (stopped) return
      stopped = true
      fire?.()
    }

    const attempt = async () => {
      if (stopped || inFlight) return
      if (Date.now() - startedAt > timeoutMs) {
        finish(timeoutRef.current)
        return
      }
      inFlight = true
      try {
        if (await checkRef.current()) finish(doneRef.current)
      } catch {
        // Transient. The next tick tries again.
      } finally {
        inFlight = false
      }
    }

    const id = setInterval(attempt, intervalMs)
    // Fires when the tab is revealed, which for these flows is usually the
    // moment the person finishes on the other side and comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void attempt()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, intervalMs, timeoutMs])
}
