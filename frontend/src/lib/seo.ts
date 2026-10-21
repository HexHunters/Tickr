import type { Metadata } from 'next'
import type { EventDetail } from '@/lib/api/contracts'

export const siteDescription =
  'Concerts, festivals, spectacles et ateliers en Tunisie. Découvrez le programme, choisissez votre sortie et retrouvez vos billets sur Tickr.'

export function siteUrl(): URL {
  const url = new URL(process.env.SITE_URL || 'http://localhost:3001')
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('SITE_URL must be an HTTP(S) origin')
  return new URL(url.origin)
}

export function isIndexable(): boolean {
  const url = siteUrl()
  return (
    process.env.SITE_INDEXABLE === 'true' &&
    url.protocol === 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).href
}

export function publicMetadata(
  title: string,
  description: string,
  path: string,
  image = '/images/social-card.png',
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: isIndexable(), follow: true },
    openGraph: {
      type: 'website',
      locale: 'fr_TN',
      siteName: 'Tickr',
      title,
      description,
      url: path,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export const privateMetadata: Metadata = {
  robots: { index: false, follow: false },
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function eventStructuredData(event: EventDetail) {
  const url = absoluteUrl(`/events/${encodeURIComponent(event.id)}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || undefined,
    startDate: event.startDate,
    endDate: event.endDate,
    url,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: event.imageUrl ? [absoluteUrl(event.imageUrl)] : undefined,
    location: {
      '@type': 'Place',
      name: event.location.address || event.location.city,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address || undefined,
        addressLocality: event.location.city,
        addressCountry: event.location.country,
      },
    },
    organizer: {
      '@type': 'Organization',
      name:
        event.organizer.displayName ||
        `${event.organizer.firstName} ${event.organizer.lastName}`.trim(),
    },
    // No offer is advertised while checkout is unavailable. Face prices alone
    // would omit buyer fees and imply a purchase action that does not exist.
  }
}
