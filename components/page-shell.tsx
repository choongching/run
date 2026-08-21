// The one column every standard page lives in.
//
// The chat page always felt right because its content sits in a single
// centered column, max-w-thread, defined once in globals.css. The other pages
// each invented their own container: Settings capped its body at max-w-xl but
// let the header run the full card, Knowledge capped nothing so its
// description ran the whole width while the empty state centered itself
// mid-card, and Connectors picked max-w-2xl. Four widths, three of them
// left-anchored, and every page disagreeing with its own loading skeleton.
//
// This is the fix at the source: one shell, the same width token the chat
// column uses, so header, body, empty states and skeletons land in the same
// place on every route and cannot drift apart page by page.
//
// There used to be a `wide` exception for Routines, on the argument that a
// management list is scanned left to right and the reading column squeezes it
// into a ribbon. It went when the pages were unified: a routine's rows now sit
// in a bordered box inside a card like every other list in the app, and one
// page running wider than the rest was the loudest thing about it. Founder's
// call, made on the canvas.
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto w-full max-w-thread">{children}</div>
    </div>
  )
}
