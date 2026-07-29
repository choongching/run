// Turn whatever went wrong into something a person can read.
//
// Six routes used to catch an exception and forward its message straight to the
// screen, which is how "status is not defined" and a raw Anthropic payload both
// ended up in a conversation. Everything now comes through here instead: one
// place that decides what kind of failure it was, what to say about it, and
// whether trying again is worth offering.
//
// Keeping it in one file is the point. Twenty phrasings spread across six
// routes drift apart within a month.

export type ChatError = {
  // One plain sentence. Never an exception, a status code, or an identifier.
  message: string
  // An optional second line, for when there is something useful to suggest.
  sub?: string
  // Whether trying the same thing again is likely to work.
  retry: boolean
  // Shown only when the fault is ours, so someone has something to quote and we
  // have something to search the logs for.
  reference?: string
}

// Anthropic's SDK errors carry an HTTP status; so do ours from fetch failures.
function statusOf(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: unknown }).status
    if (typeof status === 'number') return status
  }
  return null
}

function textOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? '')
}

function newReference(): string {
  return Math.random().toString(16).slice(2, 8)
}

export function toChatError(err: unknown): ChatError {
  const status = statusOf(err)
  const text = textOf(err)

  // Stopping is not failing.
  if (err instanceof Error && err.name === 'AbortError') {
    return { message: '', retry: false }
  }

  if (status === 429 || /rate.?limit/i.test(text)) {
    return {
      message: 'Too much at once, so this one did not go through.',
      sub: 'Give it a moment and try again.',
      retry: true,
    }
  }

  if ((status !== null && status >= 500) || /overloaded/i.test(text)) {
    return {
      message: 'The model is busy right now.',
      sub: 'This usually clears in a few seconds.',
      retry: true,
    }
  }

  if (status === 401 || status === 403) {
    return {
      message: 'Run cannot reach the model right now.',
      sub: 'This one is on us. Nothing you did caused it.',
      retry: false,
      reference: newReference(),
    }
  }

  // The session and what we sent it disagree: a tool call left unanswered, an
  // event out of order. Picking the conversation up again clears it.
  if (status === 400 && /waiting on responses|may be sent|invalid.*event/i.test(text)) {
    return {
      message: 'This conversation got out of step.',
      sub: 'Trying again usually sorts it out.',
      retry: true,
    }
  }

  if (status === 404 || /session.*(not found|expired|terminated)/i.test(text)) {
    return {
      message: 'This conversation timed out.',
      sub: 'Your history is safe. Carry on below and it will pick up again.',
      retry: true,
    }
  }

  if (status === 413 || /too large|context.*exceed/i.test(text)) {
    return {
      message: 'That was too much to send in one go.',
      sub: 'Try breaking it into smaller pieces.',
      retry: false,
    }
  }

  // Anything left is ours: a bug, a database that would not answer, something
  // we did not anticipate. Say so plainly rather than guessing, and leave a
  // reference behind.
  const reference = newReference()
  console.error(`chat error [${reference}]`, err)
  return {
    message: 'Something went wrong on our end.',
    sub: 'It was not your message. Trying again usually works.',
    retry: true,
    reference,
  }
}
