import { OrganizerWorkspace } from '@/components/organizer/workspace'
import { Attendance } from '@/components/entrance/attendance'

export const metadata = { title: 'Suivi des entrées' }
export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <OrganizerWorkspace>
      <Attendance key={id} id={id} />
    </OrganizerWorkspace>
  )
}
