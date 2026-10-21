import { collections } from '@/lib/programme'
import { absoluteUrl, isIndexable } from '@/lib/seo'

import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return []
  return [
    '/',
    '/events',
    '/help',
    ...collections.map((item) => `/programme/${item.slug}`),
  ].map((path) => ({ url: absoluteUrl(path) }))
}
