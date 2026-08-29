import type { MetadataRoute } from 'next'

// The pages a person can reach without an account.
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryrun.today'
  return [
    { url: `${site}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${site}/login`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${site}/register`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${site}/forgot-password`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
