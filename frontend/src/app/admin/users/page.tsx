import { AdminUserList } from '@/components/admin/user-list'
import { AdminWorkspace } from '@/components/admin/workspace'

export const metadata = { title: 'Comptes · Administration' }

export default function AdminUsersPage() {
  return (
    <AdminWorkspace>
      <AdminUserList />
    </AdminWorkspace>
  )
}
