import type { MetadataRoute } from 'next'

// The front page and the doors are public. Everything else redirects a
// crawler to /login anyway, but saying so here keeps the redirects out of
// the index. /landing is the front page's internal address (the proxy
// rewrites / to it), so it must not be indexed as a second copy.
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryrun.today'
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/login', '/register', '/forgot-password'],
      disallow: ['/landing', '/api/', '/auth/', '/chat/', '/knowledge', '/connectors', '/settings', '/routines', '/reset-password'],
    },
    sitemap: `${site}/sitemap.xml`,
  }
}
