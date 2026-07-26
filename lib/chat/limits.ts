// Lightweight abuse guards for the chat surface. Not a hardened defense, just
// a backstop so a stuck loop or an accidental giant paste can't quietly burn
// tokens. Client-safe (no server imports): the composer uses MAX_MESSAGE_CHARS
// for its textarea cap, the message route enforces both.

// A single typed message is capped well above any real message; attached file
// text has its own (larger) cap in lib/files/extract.
export const MAX_MESSAGE_CHARS = 16_000

// New user turns per minute. A person never approaches this; it stops a runaway
// programmatic loop.
export const MAX_TURNS_PER_MINUTE = 20
