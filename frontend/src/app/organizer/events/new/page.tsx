import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import { OrganizerWorkspace } from '@/components/organizer/workspace'
import { OrganizerEventForm } from '@/components/organizer/event-form'

export const metadata = { title: 'Créer un événement' }

export default function NewEventPage() {
  return (
    <OrganizerWorkspace>
      <Link className="back-link" href="/organizer/events">
        <ArrowLeftIcon />
        Mes événements
      </Link>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">Une nouvelle idée de sortie</p>
          <h1>À vous la scène.</h1>
          <p>Commencez par l’essentiel. La billetterie vient juste après.</p>
        </div>
      </div>
      <OrganizerEventForm />
    </OrganizerWorkspace>
  )
}
