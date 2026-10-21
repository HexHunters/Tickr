import { OrganizerWorkspace } from '@/components/organizer/workspace'
import { OrganizerEvents } from '@/components/organizer/event-list'

export const metadata = { title: 'Espace organisateur' }

export default function OrganizerPage() {
  return (
    <OrganizerWorkspace>
      <OrganizerEvents overview />
    </OrganizerWorkspace>
  )
}
