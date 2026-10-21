import 'server-only'

import { eventListSchema, paginated } from '@/lib/api/contracts'
import { serverApi } from '@/lib/api/server'

// Only the crawler inventory is cached. Public detail and purchase data are not.
export function sitemapEvents(page: number) {
  return serverApi(
    `events?page=${page}&limit=100&sortBy=startDate&sortOrder=ASC`,
    paginated(eventListSchema),
    300,
  )
}
