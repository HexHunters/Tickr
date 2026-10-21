import { notFound } from 'next/navigation'

import { sitemapEvents } from '@/lib/api/sitemap'
import { absoluteUrl, isIndexable } from '@/lib/seo'

import type { MetadataRoute } from 'next'

export const revalidate = 300

export async function generateSitemaps() {
  if (!isIndexable()) return []
  const result = await sitemapEvents(1)
  return Array.from({ length: result.totalPages }, (_, id) => ({ id }))
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable()) return []
  const page = Number(await id) + 1
  if (!Number.isSafeInteger(page) || page < 1) notFound()
  const result = await sitemapEvents(page)
  if (page > result.totalPages) notFound()
  return result.data
    .filter((event) => event.status === 'PUBLISHED')
    .map((event) => ({
      url: absoluteUrl(`/events/${encodeURIComponent(event.id)}`),
    }))
}
