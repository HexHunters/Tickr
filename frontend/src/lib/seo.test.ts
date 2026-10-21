import { afterEach, describe, expect, it, vi } from 'vitest'

import { eventDetailSchema } from '@/lib/api/contracts'
import {
  absoluteUrl,
  eventStructuredData,
  isIndexable,
  privateMetadata,
  publicMetadata,
  serializeJsonLd,
  siteUrl,
} from '@/lib/seo'
import { discoveryHref, discoveryPath } from '@/lib/programme'
import { tunisInputToIso, tunisInputValue } from '@/lib/organizer'

const event = eventDetailSchema.parse({
  id: 'event-123',
  title: 'Un concert </script><script>alert(1)</script>',
  description: 'Le programme du soir.',
  category: 'CONCERT',
  location: { city: 'Tunis', country: 'Tunisie', address: 'Salle du concert' },
  startDate: '2027-01-15T18:00:00.000Z',
  endDate: '2027-01-15T21:00:00.000Z',
  imageUrl: '/demo/posters/sonores.png',
  status: 'PUBLISHED',
  isSoldOut: false,
  isOnSale: true,
  organizer: { id: 'organizer-123', firstName: 'Tickr', lastName: 'Studio' },
  ticketTypes: [],
})

afterEach(() => vi.unstubAllEnvs())

describe('indexing and metadata', () => {
  it('keeps previews and localhost out of the index even with an opt in', () => {
    vi.stubEnv('SITE_URL', 'http://localhost:3001')
    vi.stubEnv('SITE_INDEXABLE', 'true')
    expect(isIndexable()).toBe(false)
    vi.stubEnv('SITE_URL', 'https://preview.example.com')
    vi.stubEnv('SITE_INDEXABLE', 'false')
    expect(isIndexable()).toBe(false)
  })
  it('requires an HTTPS public origin and an explicit opt in', () => {
    vi.stubEnv('SITE_URL', 'https://tickets.example.com/path')
    vi.stubEnv('SITE_INDEXABLE', 'true')
    expect(isIndexable()).toBe(true)
    expect(siteUrl().href).toBe('https://tickets.example.com/')
    expect(absoluteUrl('/events/123')).toBe(
      'https://tickets.example.com/events/123',
    )
    const metadata = publicMetadata(
      'Un concert',
      'Une sortie à Tunis.',
      '/events/123',
    )
    expect(metadata.alternates?.canonical).toBe('/events/123')
    expect(metadata.robots).toEqual({ index: true, follow: true })
    expect(privateMetadata.robots).toEqual({ index: false, follow: false })
    vi.stubEnv('SITE_URL', 'http://tickets.example.com')
    expect(isIndexable()).toBe(false)
  })
  it('rejects non HTTP origins', () => {
    vi.stubEnv('SITE_URL', 'javascript:alert(1)')
    expect(() => siteUrl()).toThrow()
  })
  it('uses server event facts without advertising an unavailable checkout', () => {
    vi.stubEnv('SITE_URL', 'https://tickets.example.com')
    const data = eventStructuredData(event)
    expect(data.name).toBe(event.title)
    expect(data.startDate).toBe(event.startDate)
    expect(data.organizer.name).toBe('Tickr Studio')
    expect(data.location.address.addressLocality).toBe('Tunis')
    expect(data.image).toEqual([
      'https://tickets.example.com/demo/posters/sonores.png',
    ])
    expect(data).not.toHaveProperty('offers')
  })
  it('prevents event text from closing the JSON-LD script', () => {
    const serialized = serializeJsonLd(eventStructuredData(event))
    expect(serialized).not.toContain('</script>')
    expect(JSON.parse(serialized).name).toBe(event.title)
  })
})

describe('crawlable discovery filters', () => {
  it('keeps search separate from unsupported API facets', () => {
    expect(
      discoveryPath({
        query: 'jazz & live',
        city: 'Tunis',
        category: 'CONCERT',
        sort: 'title',
        page: 2,
      }),
    ).toBe('events/search?page=2&limit=12&q=jazz+%26+live')
  })
  it('preserves filters across pagination and encodes special characters', () => {
    const filters = {
      query: '',
      city: 'La Marsa',
      category: 'CONCERT',
      sort: 'title',
      page: 2,
    }
    expect(discoveryHref(filters)).toBe(
      '/events?category=CONCERT&city=La+Marsa&sort=title&page=2',
    )
    expect(discoveryPath(filters)).toBe(
      'events?page=2&limit=12&category=CONCERT&city=La+Marsa&sortBy=title&sortOrder=ASC',
    )
    expect(discoveryHref({ page: 1 })).toBe('/events')
  })
})

describe('organizer hours in Tunis', () => {
  it('round trips a Tunis time without using the browser timezone', () => {
    expect(tunisInputValue('2027-01-15T18:00:00.000Z')).toBe('2027-01-15T19:00')
    expect(tunisInputToIso('2027-01-15T19:00')).toBe('2027-01-15T18:00:00.000Z')
    expect(tunisInputToIso('2027-07-15T00:15')).toBe('2027-07-14T23:15:00.000Z')
  })
  it('rejects malformed, impossible and normalized dates', () => {
    for (const value of [
      '',
      '2027-02-30T19:00',
      '2027-99-15T19:00',
      '2027-01-15',
      '2027-01-15T24:10',
    ])
      expect(() => tunisInputToIso(value)).toThrow()
  })
})
