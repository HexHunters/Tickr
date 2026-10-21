import { OrganizerWorkspace } from '@/components/organizer/workspace'
import { OrganizerEventManager } from '@/components/organizer/event-manager'

export const metadata = { title: 'Gérer mon événement' }

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <OrganizerWorkspace>
      <OrganizerEventManager id={id} />
    </OrganizerWorkspace>
  )
}
