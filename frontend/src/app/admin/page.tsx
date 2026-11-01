import { AdminOverview } from '@/components/admin/overview'
import { AdminWorkspace } from '@/components/admin/workspace'

export const metadata = { title: 'Administration' }

export default function AdminPage() {
  return (
    <AdminWorkspace>
      <AdminOverview />
    </AdminWorkspace>
  )
}
