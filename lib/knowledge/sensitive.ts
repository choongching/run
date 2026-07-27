// Flag secrets before they become always-on context.
//
// Anything saved as knowledge is composed into the agent's system prompt, so it
// is sent to the model on every single turn and sits in the database in plain
// text. A credential pasted here is therefore not one leak, it is a leak per
// message. This scan exists to say so at the moment of saving.
//
// It WARNS, it does not block. A style guide can legitimately talk about
// password resets, and a CSV can hold a column of long ids. Refusing those would
// train people to work around the feature. Requiring one deliberate confirm on a
// real-looking credential is the honest middle.
//
// Pure regex over text, no network, no model call, so it is instant and works
// the same on the client and the server.

export type SensitiveFinding = {
  // What was matched, in plain language for the warning copy.
  label: string
}

// High-signal patterns only. Each one, on its own, is hard to explain away.
const PATTERNS: { label: string; re: RegExp }[] = [
  {
    label: 'a private key block',
    re: /-----BEGIN[A-Z ]*PRIVATE KEY-----/,
  },
  { label: 'an AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'an OpenAI-style API key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'an Anthropic API key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'a GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { label: 'a Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: 'a Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: 'a JSON web token', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  {
    label: 'a password or API key written next to its value',
    // A secret-ish name, then an assignment, then a value long enough and
    // unbroken enough to be a real credential rather than prose.
    re: /\b(?:api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["']?[A-Za-z0-9/+_.-]{12,}/i,
  },
]

// Digit runs that look like a payment card, confirmed with the Luhn checksum so
// order numbers and long ids do not trip it.
function hasCardNumber(text: string): boolean {
  const candidates = text.match(/\b(?:\d[ -]*?){13,19}\b/g)
  if (!candidates) return false
  return candidates.some((raw) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) return false
    let sum = 0
    let double = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits.charCodeAt(i) - 48
      if (double) {
        d *= 2
        if (d > 9) d -= 9
      }
      sum += d
      double = !double
    }
    return sum % 10 === 0
  })
}

export function scanForSecrets(text: string): SensitiveFinding[] {
  const found: SensitiveFinding[] = []
  for (const p of PATTERNS) {
    if (p.re.test(text)) found.push({ label: p.label })
  }
  if (hasCardNumber(text)) found.push({ label: 'what looks like a card number' })
  return found
}

// One plain sentence naming what was spotted, for the confirm step. Lists at
// most two so the warning stays readable.
export function sensitiveWarning(findings: SensitiveFinding[]): string {
  if (findings.length === 0) return ''
  const labels = findings.map((f) => f.label)
  const named =
    labels.length === 1
      ? labels[0]
      : labels.length === 2
        ? `${labels[0]} and ${labels[1]}`
        : `${labels[0]}, ${labels[1]}, and more`
  return `This looks like it contains ${named}. Knowledge is sent to the agent on every message, so save it only if you meant to.`
}
