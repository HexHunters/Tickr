import { sitemapEvents } from '@/lib/api/sitemap'
import { absoluteUrl, isIndexable } from '@/lib/seo'

import type { MetadataRoute } from 'next'

export const revalidate = 300

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!isIndexable()) return { rules: { userAgent: '*', disallow: '/' } }
  const result = await sitemapEvents(1)
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        '/account',
        '/organizer',
        '/orders',
        '/tickets',
        '/checkout',
        '/verify-email',
        '/reset-password',
        '/sitemaps/',
      ],
    },
    sitemap: [
      absoluteUrl('/sitemap.xml'),
      ...Array.from({ length: result.totalPages }, (_, id) =>
        absoluteUrl(`/events/sitemap/${id}.xml`),
      ),
    ],
  }
}
