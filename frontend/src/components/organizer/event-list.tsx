'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  PlusIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

import { DataState, LoadingState } from '@/components/design/data-state'
import { useSession } from '@/components/session-provider'
import { eventListSchema, paginated } from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime } from '@/lib/format'
import { eventStatusLabels } from '@/lib/organizer'

export function OrganizerEvents({ overview = false }: { overview?: boolean }) {
  const { user } = useSession()
  const [page, setPage] = useState(1)
  const events = useQuery({
    queryKey: ['organizer-events', user?.id, page, overview],
    queryFn: () =>
      requestApi(
        `events/organizer/${user?.id}?page=${page}&limit=${overview ? 5 : 12}`,
        paginated(eventListSchema),
      ),
    enabled: Boolean(user),
    retry: false,
  })
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">
            {overview ? `Bonjour ${user?.firstName || ''}` : 'Votre programme'}
          </p>
          <h1>{overview ? 'Tout se prépare ici.' : 'Mes événements.'}</h1>
          <p>
            {overview
              ? 'Vos créations, de la première idée au soir de l’événement.'
              : 'Retrouvez vos brouillons et vos événements publiés.'}
          </p>
        </div>
        <Link className="button button-primary" href="/organizer/events/new">
          <PlusIcon />
          Créer un événement
        </Link>
      </div>
      {overview && (
        <div className="workspace-summary">
          <div>
            <span>Événements au total</span>
            <strong>{events.data?.total ?? '—'}</strong>
          </div>
          <p>
            Préparez un brouillon, ajoutez vos tarifs, puis publiez quand tout
            est prêt.
          </p>
          <Link className="text-link" href="/help#organiser">
            Comment publier ?<ArrowRightIcon />
          </Link>
        </div>
      )}
      <div className="workspace-section-title">
        <h2>{overview ? 'Vos dernières créations' : 'Tous vos événements'}</h2>
        {overview && (
          <Link className="text-link" href="/organizer/events">
            Tout voir
            <ArrowRightIcon />
          </Link>
        )}
      </div>
      {events.isPending ? (
        <LoadingState />
      ) : events.isError ? (
        <DataState error={events.error} onRetry={() => void events.refetch()} />
      ) : events.data.data.length ? (
        <>
          <div className="organizer-event-list">
            {events.data.data.map((event) => (
              <Link
                key={event.id}
                href={`/organizer/events/${event.id}`}
                className="organizer-event-row"
              >
                <span className="organizer-date">
                  <CalendarDaysIcon />
                  {formatEventDate(event.startDate)}
                </span>
                <div>
                  <span
                    className={`status-pill ${event.status === 'PUBLISHED' ? 'status-success' : 'status-neutral'}`}
                  >
                    {eventStatusLabels[event.status] || event.status}
                  </span>
                  <h3>{event.title}</h3>
                  <p>
                    {event.location.city} · {formatEventTime(event.startDate)},
                    Tunis
                  </p>
                </div>
                <span className="organizer-row-action">
                  Gérer
                  <ArrowRightIcon />
                </span>
              </Link>
            ))}
          </div>
          {!overview && (
            <div className="pagination">
              <button
                className="button button-outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Précédent
              </button>
              <span>
                Page {page} sur {Math.max(events.data.totalPages, 1)}
              </span>
              <button
                className="button button-outline"
                disabled={page >= events.data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <CalendarDaysIcon />
          <h2>Votre première scène commence ici.</h2>
          <p>Créez un brouillon. Il restera privé jusqu’à sa publication.</p>
          <Link className="button button-primary" href="/organizer/events/new">
            Créer mon premier événement
            <PlusIcon />
          </Link>
        </div>
      )}
      {overview && (
        <aside className="workspace-note">
          <h3>Avant de lever le rideau</h3>
          <p>
            Vérifiez le lieu, les horaires et la période de vente de chaque
            tarif. La publication rend votre événement visible dans le
            programme.
          </p>
        </aside>
      )}
    </>
  )
}
