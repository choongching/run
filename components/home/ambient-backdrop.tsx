// The wall behind the prompt box on the home screen.
//
// The home screen is the emptiest surface in the app and the one people look
// at while deciding what to ask for. It used to be three blurred green washes
// drifting behind the box, which was atmosphere built from the palette
// because there was nothing else to build it from. This is a photograph
// instead: monstera shadows thrown across a pale wall, filling the region
// edge to edge, so the screen reads as a place with light in it rather than a
// panel with a tint on it.
//
// The picture does three jobs at once, which is why it earns the bytes: the
// leaf mass sits to the left, so the composer lands on open wall; the wall's
// own grain gives the flat card above it something to sit on; and the light
// falls from the top left, which is the direction every shadow in the app
// already assumes.
//
// Deliberately cheap. Two WebP sizes (18KB and 70KB), softened by just over a
// pixel before encoding, which is invisible at display size and takes the
// wall's noise out of the encoder's way: the same picture without it costs
// 216KB. It is decorative, so it carries an empty alt, never takes a pointer,
// and is fetched at low priority so it cannot compete with the headline.
export function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      // rounded-shell matches the content card this sits inside. The layer is
      // exactly coincident with that card, and without the radius the picture
      // squares off its two top corners: the shell keeps its rounded edge
      // everywhere in the app except the one screen with a photograph in it.
      className="run-wash-layer pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-shell"
    >
      {/* A plain img, not next/image. The picture is already exactly the two
          sizes it needs, so the optimizer would re-encode a file we tuned by
          hand and bill a transform for it; srcSet picks the small one on a
          phone, which next/image with `unoptimized` cannot do at all. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
      <img
        src="/home-backdrop-2200.webp"
        srcSet="/home-backdrop-1400.webp 1400w, /home-backdrop-2200.webp 2200w"
        sizes="100vw"
        alt=""
        decoding="async"
        fetchPriority="low"
        className="run-backdrop absolute inset-0 size-full object-cover"
      />
      {/* The photograph is a cooler green than the app's warm paper canvas,
          and the sidebar sits two inches away in that warm gray. This veil is
          what keeps the two in the same room: a sheet of the canvas colour
          laid over the picture, which pulls the mint back toward the palette
          and lifts the muted greeting off the darker leaves. */}
      <span className="run-backdrop-veil absolute inset-0" />
    </div>
  )
}
