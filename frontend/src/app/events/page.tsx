import { EventDiscovery } from '@/components/design/event-discovery'
import { readSearchValue } from '@/lib/format'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Le programme' }

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = readSearchValue(params.query)
  const category = readSearchValue(params.category)
  const city = readSearchValue(params.city)
  return (
    <EventDiscovery
      initialQuery={query}
      initialCategory={category}
      initialCity={city}
      key={`${query}-${category}-${city}`}
    />
  )
}
