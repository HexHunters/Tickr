import { notFound } from 'next/navigation'

import { EventDiscovery } from '@/components/design/event-discovery'
import { getPublicEvents } from '@/lib/api/catalog'
import { categoryLabels } from '@/lib/api/contracts'
import { readSearchValue } from '@/lib/format'
import { publicMetadata } from '@/lib/seo'
import { discoveryHref, discoveryPath } from '@/lib/programme'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

async function parseFilters(searchParams: SearchParams) {
  const params = await searchParams
  const category = readSearchValue(params.category).toUpperCase()
  const page = Number(readSearchValue(params.page))
  return {
    query: readSearchValue(params.query).slice(0, 200),
    category: Object.hasOwn(categoryLabels, category) ? category : '',
    city: readSearchValue(params.city).slice(0, 100),
    sort: readSearchValue(params.sort) === 'title' ? 'title' : 'startDate',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filters = await parseFilters(searchParams)
  // Resolve the shared catalog read before flushing the head. This keeps the
  // complete discovery HTML usable by crawlers and browsers without JavaScript.
  const catalog = await getPublicEvents(discoveryPath(filters)).catch(
    () => null,
  )
  if (catalog && filters.page > 1 && filters.page > catalog.totalPages)
    notFound()
  const metadata = publicMetadata(
    'Le programme des sorties en Tunisie',
    'Trouvez votre prochaine sortie en Tunisie. Consultez les concerts, festivals, spectacles et ateliers, leurs dates et leurs lieux.',
    discoveryHref({ page: filters.page }),
  )
  if (
    !catalog ||
    filters.query ||
    filters.category ||
    filters.city ||
    filters.sort !== 'startDate'
  )
    metadata.robots = { index: false, follow: true }
  return metadata
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filters = await parseFilters(searchParams)
  return <EventDiscovery filters={filters} />
}
