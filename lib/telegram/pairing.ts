import { createHmac, timingSafeEqual } from 'node:crypto'

// The pairing token: a signed, short-lived claim that says "whoever presents
// this is the person who pressed the button in the app".
//
// It exists because Telegram will not tell us who someone is in our terms. The
// webhook receives a chat id and whatever text came with /start, and nothing
// else. So the app mints a token the person carries into Telegram, and the
// token is what binds their chat id to their account.
//
// Stateless on purpose: signed and self-expiring rather than a row in a table.
// A pairing attempt is a fifteen-minute affair with no state worth keeping,
// and a table would need its own cleanup job for something HMAC already does.
//
// THE FORMAT IS FIXED-WIDTH, AND THAT IS NOT A STYLE CHOICE. Telegram's
// deep-link payload allows only A-Z a-z 0-9 _ and -, at most 64 characters.
// Base64url signatures already contain _ and -, so there is no character left
// to use as a separator: an earlier version split on _ and every token with an
// underscore in its signature parsed as malformed. Fields are parsed by
// position instead.
//
//   [0,32)  user id, uuid with the dashes removed
//   [32,40) expiry, base36, zero padded
//   [40,56) HMAC-SHA256, base64url, truncated to 96 bits
//
// 56 characters, inside the 64 budget with room to spare.
//
// Server only.

const ID_LEN = 32
const EXP_LEN = 8
const MAC_LEN = 16
const TOKEN_LEN = ID_LEN + EXP_LEN + MAC_LEN

// Long enough that an abandoned tab still works after a coffee, short enough
// that a link pasted somewhere public is dead before it is found. That window
// is the whole mitigation for the one real risk here: anyone holding a live
// token can bind THEIR Telegram chat to the account it names, and would then
// receive that account's reports. Same risk profile as a magic link, handled
// the same way, which is why the window is minutes and not days.
const TTL_MS = 15 * 60 * 1000

function secret(): string {
  const value = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!value) throw new Error('TELEGRAM_WEBHOOK_SECRET is not set')
  return value
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, MAC_LEN)
}

export function mintPairingToken(userId: string): string {
  const compactId = userId.replace(/-/g, '')
  const expires = (Date.now() + TTL_MS).toString(36).padStart(EXP_LEN, '0')
  return `${compactId}${expires}${sign(`${compactId}${expires}`)}`
}

export type PairingCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: 'malformed' | 'expired' | 'bad_signature' }

// Verified in this order deliberately: shape, then signature, then expiry. An
// expired but genuine token gets to say "expired", which is the message that
// tells someone to fetch a fresh link. Checking expiry before the signature
// would leak that a forged token had a valid shape.
export function verifyPairingToken(token: string): PairingCheck {
  if (token.length !== TOKEN_LEN) return { ok: false, reason: 'malformed' }
  const compactId = token.slice(0, ID_LEN)
  const expires = token.slice(ID_LEN, ID_LEN + EXP_LEN)
  const mac = token.slice(ID_LEN + EXP_LEN)
  if (!/^[0-9a-f]{32}$/.test(compactId)) return { ok: false, reason: 'malformed' }

  const expected = sign(`${compactId}${expires}`)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' }
  }

  const expiresAt = parseInt(expires, 36)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { ok: false, reason: 'expired' }
  }

  const userId = [
    compactId.slice(0, 8),
    compactId.slice(8, 12),
    compactId.slice(12, 16),
    compactId.slice(16, 20),
    compactId.slice(20),
  ].join('-')
  return { ok: true, userId }
}

// Where the button in the app points. The bot's username is public and safe in
// a client component, unlike the token.
export function pairingLink(token: string): string {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  if (!bot) throw new Error('NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set')
  return `https://t.me/${bot}?start=${token}`
}
