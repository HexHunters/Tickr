import { AdminEventList } from '@/components/admin/event-list'
import { AdminWorkspace } from '@/components/admin/workspace'

export const metadata = { title: 'Événements · Administration' }

export default function AdminEventsPage() {
  return (
    <AdminWorkspace>
      <AdminEventList />
    </AdminWorkspace>
  )
}
