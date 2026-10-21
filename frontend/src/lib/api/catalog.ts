import 'server-only'

import { cache } from 'react'

import {
  eventDetailSchema,
  eventListSchema,
  paginated,
} from '@/lib/api/contracts'
import { serverApi } from '@/lib/api/server'

// Memoization is scoped to a render. Prices, status and inventory stay fresh
// across requests; metadata and page content share the same detail response.
export const getPublicEvent = cache((id: string) =>
  serverApi(`events/${encodeURIComponent(id)}`, eventDetailSchema),
)
export const getPublicEvents = cache((path: string) =>
  serverApi(path, paginated(eventListSchema)),
)

export const getUpcomingPublicEvents = cache(
  (category: string, limit: number) => {
    const params = new URLSearchParams({
      limit: String(limit),
      sortBy: 'startDate',
      sortOrder: 'ASC',
      dateFrom: new Date().toISOString(),
    })
    if (category) params.set('category', category)
    return getPublicEvents(`events?${params}`)
  },
)
