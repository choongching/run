// Which hostnames the favicon proxy is willing to touch.
//
// This lives apart from the route because it is the whole security story and
// it deserves to be readable on its own, and testable without a request.
//
// A proxy that fetches a host somebody names is a server-side request forgery
// primitive by default: our server has network positions a browser does not,
// including cloud metadata endpoints and anything else on the private network.
// So the rule is an ALLOW shape rather than a block list. A hostname has to
// look like an ordinary registrable domain to get through, and everything else
// is refused without being clever about why.

// Deliberately strict: letters, digits, single hyphens inside labels, at least
// two labels, and a final label that is alphabetic. That last clause is what
// rejects every IPv4 literal without needing to parse one, since 169.254.169.254
// ends in digits. Colons are absent from the class, so no ports and no IPv6.
// Underscores and credentials cannot appear either.
const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

// Names that parse as ordinary domains but resolve somewhere we must never go.
// `localhost` has no dot so HOSTNAME already refuses it; these are the ones
// that would otherwise pass.
const FORBIDDEN_SUFFIX = [
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.corp',
  '.home',
  '.lan',
  '.test',
  '.example',
  '.invalid',
  '.onion',
]

export function safeHost(raw: string | null): string | null {
  if (!raw) return null
  const host = raw.trim().toLowerCase()
  if (host.length > 253) return null
  if (!HOSTNAME.test(host)) return null
  if (FORBIDDEN_SUFFIX.some((s) => host.endsWith(s))) return null
  return host
}

// What the chip prints: the registrable name with the public suffix dropped.
// `cnbc.com` reads as `cnbc`, `bbc.co.uk` as `bbc`, and a subdomain survives
// only when it carries meaning, which in practice means anything that is not
// `www`.
//
// This is a heuristic, not a public-suffix-list implementation. Pulling in the
// real list is a dependency and a megabyte to make a 10px label marginally
// better; it can be revisited if a real domain ever reads wrong.
const TWO_PART_SUFFIX = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.jp', 'or.jp', 'ne.jp',
  'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'com.cn', 'com.sg',
  'com.hk', 'co.in', 'co.za', 'com.mx', 'com.tr',
])

export function domainLabel(host: string): string {
  const bare = host.replace(/^www\./, '')
  const parts = bare.split('.')
  if (parts.length < 2) return bare

  const lastTwo = parts.slice(-2).join('.')
  const suffixLength = TWO_PART_SUFFIX.has(lastTwo) ? 2 : 1
  const nameIndex = parts.length - suffixLength - 1
  if (nameIndex < 0) return bare

  // Everything in front of the public suffix, minus the suffix itself. A lone
  // registrable name gives `cnbc`; a subdomain that survived gives
  // `finance.yahoo`.
  return parts.slice(0, nameIndex + 1).join('.')
}
