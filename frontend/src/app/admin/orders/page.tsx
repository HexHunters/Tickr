import { AdminOrderList } from '@/components/admin/order-list'
import { AdminWorkspace } from '@/components/admin/workspace'
import { readSearchValue } from '@/lib/format'

export const metadata = { title: 'Commandes · Administration' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string | string[] }>
}) {
  const eventId = readSearchValue((await searchParams).eventId)
  return (
    <AdminWorkspace>
      <AdminOrderList
        key={eventId}
        eventId={uuid.test(eventId) ? eventId : undefined}
      />
    </AdminWorkspace>
  )
}
