import type { MetadataRoute } from 'next'

// Only the doors are public. Everything else redirects a crawler to /login
// anyway, but saying so here keeps the redirects out of the index.
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryrun.today'
  return {
    rules: {
      userAgent: '*',
      allow: ['/login', '/register', '/forgot-password'],
      disallow: ['/api/', '/auth/', '/chat/', '/knowledge', '/connectors', '/settings', '/routines', '/reset-password'],
    },
    sitemap: `${site}/sitemap.xml`,
  }
}
