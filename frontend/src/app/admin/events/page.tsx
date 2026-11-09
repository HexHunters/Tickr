import { AdminEventList } from '@/components/admin/event-list'
import { AdminWorkspace } from '@/components/admin/workspace'
import { readSearchValue } from '@/lib/format'

export const metadata = { title: 'Événements · Administration' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizerId?: string | string[] }>
}) {
  const organizerId = readSearchValue((await searchParams).organizerId)
  return (
    <AdminWorkspace>
      <AdminEventList
        key={organizerId}
        organizerId={uuid.test(organizerId) ? organizerId : undefined}
      />
    </AdminWorkspace>
  )
}
