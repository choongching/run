// The tiny contract between "somewhere that wants words in the composer" and
// the composer itself.
//
// Two ways words arrive pre-typed: the Configure panel's New routine button
// (same page as the composer, so a DOM event is enough) and links from the
// Routines page (?prefill= on the chat URL, read by the page and passed as
// the composer's initial value). Both end with the person looking at a
// sentence they can edit and send, never with anything sent for them.

export const PREFILL_EVENT = 'run:prefill'

export function dispatchPrefill(text: string) {
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: text }))
}
