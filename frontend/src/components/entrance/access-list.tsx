'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  QrCodeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { PageControls } from '@/components/entrance/page-controls'
import { accessEventSchema } from '@/lib/api/entrance-contracts'
import { paginated } from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime } from '@/lib/format'

function AccessibleEvents() {
  const [page, setPage] = useState(1)
  const events = useQuery({
    queryKey: ['check-in-access', page],
    queryFn: () =>
      requestApi(
        `events/check-in-access/me?page=${page}&limit=12`,
        paginated(accessEventSchema),
      ),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  if (events.isPending) return <LoadingState label="Recherche de vos accès…" />
  if (events.isError)
    return (
      <DataState error={events.error} onRetry={() => void events.refetch()} />
    )
  if (!events.data.data.length)
    return (
      <div className="empty-state">
        <QrCodeIcon />
        <h2>Vos accès se préparent.</h2>
        <p>
          Les événements dont vous assurez l’entrée apparaîtront ici. Demandez à
          l’organisateur de vous ajouter à son équipe avec l’adresse de votre
          compte.
        </p>
        <Link
          prefetch={false}
          href="/account"
          className="button button-outline"
        >
          Voir mon compte
        </Link>
      </div>
    )
  return (
    <>
      <div className="entrance-access-list">
        {events.data.data.map((event) => (
          <Link
            prefetch={false}
            key={event.eventId}
            href={`/check-in/${event.eventId}`}
            className="entrance-access-row"
          >
            <span className="entrance-access-icon">
              <QrCodeIcon />
            </span>
            <div>
              <p>
                {event.authorizationSource === 'OWNER'
                  ? 'Votre événement'
                  : event.authorizationSource === 'ADMIN'
                    ? 'Accès administrateur'
                    : 'Équipe d’entrée'}
              </p>
              <h2>{event.title}</h2>
              <span>
                <CalendarDaysIcon />
                {formatEventDate(event.startDate)} ·{' '}
                {formatEventTime(event.startDate)}, Tunis
              </span>
            </div>
            <span className="entrance-open">
              Ouvrir
              <ArrowRightIcon />
            </span>
          </Link>
        ))}
      </div>
      <PageControls
        page={page}
        totalPages={events.data.totalPages}
        onPage={setPage}
      />
    </>
  )
}
export function EntranceAccessPage() {
  return (
    <main id="contenu" tabIndex={-1} className="container entrance-main">
      <div className="entrance-heading">
        <QrCodeIcon />
        <div>
          <p className="section-caption">Côté entrée</p>
          <h1>On vous attend.</h1>
          <p>Choisissez l’événement dont vous assurez le contrôle.</p>
        </div>
      </div>
      <SessionGate>
        <AccessibleEvents />
      </SessionGate>
    </main>
  )
}
