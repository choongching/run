// The name a person is greeted by.
//
// The profile stores whatever they typed at sign up, which is usually a full
// name. Greeting someone with all of it reads like a form letter, so both
// places that say hello (the home screen and an agent's opening line) use the
// first word of it.
//
// Returns an empty string when there is nothing usable, and every caller is
// written so the greeting simply drops the name rather than falling back to
// "there". Older accounts have no name at all, and "Hi there" is worse than
// "Hi".
export function firstName(displayName: string | null | undefined): string {
  const first = (displayName ?? '').trim().split(/\s+/)[0] ?? ''
  // Long enough for real names, short enough that a pasted sentence cannot
  // become the greeting.
  return first.slice(0, 24)
}
