import { OrganizerWorkspace } from '@/components/organizer/workspace'
import { OrganizerEvents } from '@/components/organizer/event-list'

export const metadata = { title: 'Mes événements' }

export default function OrganizerEventsPage() {
  return (
    <OrganizerWorkspace>
      <OrganizerEvents />
    </OrganizerWorkspace>
  )
}
