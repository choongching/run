'use client'

import { useSyncExternalStore } from 'react'

// Nothing to subscribe to: the time of day is read once when this mounts, and
// nobody sits on the home screen long enough for noon to arrive.
const noStore = () => () => {}

function partOfDay(): string {
  const hour = new Date().getHours()
  // Before 5am reads as the tail of the night, not the start of the day.
  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 18) return 'Afternoon'
  return 'Evening'
}

// The line above the headline: "Morning, CC."
//
// The time of day has to come from the browser. The server renders in UTC, so
// picking the word there would tell someone in Singapore good evening over
// breakfast, and rendering a guess that the client then corrects is a
// hydration mismatch. So the word is set on mount and rises in like everything
// else on this screen, one beat ahead of the mark.
//
// The paragraph reserves its own height while it is empty, so nothing below it
// moves when the word lands.
//
// No name means no name. "Hi there" is worse than the time of day on its own.
export function Greeting({ name }: { name: string }) {
  // The server snapshot is empty on purpose: the server has no idea what time
  // it is where the reader is, so it renders the reserved space and the client
  // fills it.
  const part = useSyncExternalStore(noStore, partOfDay, () => '')
  const hello = part ? (name ? `${part}, ${name}.` : `${part}.`) : ''

  // Sits tight to the headline: the two lines are one thought, and the
  // reserved height is trimmed to the text so the leading does not add a gap
  // of its own.
  return (
    <p className="run-hero-dim mb-0.5 h-6 text-[17px]/6 text-muted-foreground">
      {hello && <span className="run-rise inline-block">{hello}</span>}
    </p>
  )
}
