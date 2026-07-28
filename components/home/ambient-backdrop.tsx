// A very slow wash of colour behind the prompt box on the home screen.
//
// The home screen is the emptiest surface in the app and the one people look
// at while deciding what to ask for. A little life there reads as the product
// being awake. Anywhere else it would be noise competing with content.
//
// Deliberately cheap and deliberately quiet:
//   - three blurred radial washes, animated with transform and opacity only,
//     so the whole thing stays on the compositor and never triggers layout
//   - built from the palette's own accent tokens rather than invented colours,
//     at single-digit alpha, so it tints the canvas instead of decorating it
//   - long, offset, prime-ish durations so the three never visibly resync into
//     a pattern you can follow, which is what makes a loop feel like a loop
//   - opens by glowing up from nothing over a couple of seconds, slower than
//     any UI transition, because this is atmosphere rather than feedback
//   - honours prefers-reduced-motion by holding still, keeping the tint and
//     dropping the movement
export function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="run-wash-layer pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <span className="run-wash run-wash-a" />
      <span className="run-wash run-wash-b" />
      <span className="run-wash run-wash-c" />
    </div>
  )
}
