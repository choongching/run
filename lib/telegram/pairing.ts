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

// One hour, raised from fifteen minutes after the first real pairing on
// 2026-08-20. Fifteen was arbitrary and it failed its first contact with a
// person: pairing is a cross-device journey (press a button on a laptop, then
// find your phone, unlock it, open Telegram), and a window that expires
// mid-errand turns a working feature into a confusing one.
//
// The window is still the whole mitigation for the one real risk here: anyone
// holding a live token can bind THEIR Telegram chat to the account it names,
// and would then receive that account's reports. Same risk profile as a magic
// link, handled the same way, which is why this is an hour and not a day.
const TTL_MS = 60 * 60 * 1000

// A SIGNING key of our own, and deliberately not the webhook secret.
//
// This signed the token with TELEGRAM_WEBHOOK_SECRET until the audit on
// 2026-08-21, which is the one value in the system we hand to somebody else:
// it is registered with Telegram at setWebhook time and echoed back on every
// call. So the key that vouches for "this person pressed the button in Run"
// was a key a third party holds a copy of.
//
// What that bought an attacker who had it: mint a token naming ANY user id,
// send /start, and that account's routine reports arrive in their chat. The
// user id is not the obstacle it sounds like either, because the profiles
// table is readable by every signed-in user, so every account's uuid is a
// query away. The MOVED notice to the losing chat is what stops it being
// silent, and that is a mitigation rather than a fix.
//
// Nothing about this is exotic: a secret shared with a third party must never
// also be a signing key for your own claims. Separate values, separate jobs.
function secret(): string | null {
  return process.env.TELEGRAM_PAIRING_SECRET ?? null
}

// Minting throws, because being unable to sign is a deployment mistake rather
// than a user-facing state. The pair route already catches it and answers 503,
// so the button says Telegram is unavailable instead of handing out tokens
// nobody can verify.
function requireSecret(): string {
  const value = secret()
  if (!value) throw new Error('TELEGRAM_PAIRING_SECRET is not set')
  return value
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url').slice(0, MAC_LEN)
}

export function mintPairingToken(userId: string): string {
  const key = requireSecret()
  const compactId = userId.replace(/-/g, '')
  const expires = (Date.now() + TTL_MS).toString(36).padStart(EXP_LEN, '0')
  return `${compactId}${expires}${sign(`${compactId}${expires}`, key)}`
}

export type PairingCheck =
  | { ok: true; userId: string }
  | {
      ok: false
      reason: 'malformed' | 'expired' | 'bad_signature' | 'not_configured'
    }

// Verified in this order deliberately: shape, then signature, then expiry. An
// expired but genuine token gets to say "expired", which is the message that
// tells someone to fetch a fresh link. Checking expiry before the signature
// would leak that a forged token had a valid shape.
export function verifyPairingToken(token: string): PairingCheck {
  // Returned, not thrown. The webhook is called by Telegram, which retries
  // every non-2xx, so an unconfigured deployment throwing here would turn a
  // missing env var into a retry storm. Failing closed means no pairing, and
  // the person is told to fetch a fresh link.
  const key = secret()
  if (!key) return { ok: false, reason: 'not_configured' }

  if (token.length !== TOKEN_LEN) return { ok: false, reason: 'malformed' }
  const compactId = token.slice(0, ID_LEN)
  const expires = token.slice(ID_LEN, ID_LEN + EXP_LEN)
  const mac = token.slice(ID_LEN + EXP_LEN)
  if (!/^[0-9a-f]{32}$/.test(compactId)) return { ok: false, reason: 'malformed' }

  const expected = sign(`${compactId}${expires}`, key)
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
