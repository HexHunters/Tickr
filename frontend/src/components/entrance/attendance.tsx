'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

import { DataState, LoadingState } from '@/components/design/data-state'
import { managedEventSchema } from '@/lib/api/contracts'
import { entranceStatsSchema } from '@/lib/api/entrance-contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime } from '@/lib/format'

export function Attendance({ id }: { id: string }) {
  const event = useQuery({
    queryKey: ['managed-event', id],
    queryFn: () =>
      requestApi(`events/${encodeURIComponent(id)}/manage`, managedEventSchema),
    retry: false,
  })
  const stats = useQuery({
    queryKey: ['check-in-stats', id],
    queryFn: () =>
      requestApi(
        `tickets/event/${encodeURIComponent(id)}/stats`,
        entranceStatsSchema,
      ),
    enabled: event.isSuccess,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  return (
    <>
      <Link
        prefetch={false}
        href={`/organizer/events/${id}`}
        className="back-link"
      >
        <ArrowLeftIcon />
        Gérer l’événement
      </Link>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">
            {event.data?.title || 'Votre événement'}
          </p>
          <h1>Les entrées.</h1>
          <p>
            Les billets confirmés et leur passage à l’entrée, selon les derniers
            totaux enregistrés.
          </p>
        </div>
        <button
          className="button button-outline"
          disabled={!stats.isSuccess || stats.isFetching}
          onClick={() => void stats.refetch()}
        >
          <ArrowPathIcon />
          {stats.isFetching ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>
      {event.isError ? (
        <DataState error={event.error} onRetry={() => void event.refetch()} />
      ) : stats.isError ? (
        <DataState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : !stats.data ? (
        <LoadingState />
      ) : (
        <>
          <dl className="event-management-stats attendance-totals">
            <div>
              <dt>Billets confirmés au total</dt>
              <dd>{stats.data.totalTickets}</dd>
            </div>
            <div>
              <dt>Entrées enregistrées</dt>
              <dd>{stats.data.checkedIn}</dd>
            </div>
            <div>
              <dt>Billets non utilisés</dt>
              <dd>{stats.data.remaining}</dd>
            </div>
          </dl>
          <section className="attendance-progress">
            <div>
              <h2>{stats.data.checkInRate} % des billets utilisés</h2>
              <p>
                {stats.data.totalTickets
                  ? 'Les réservations non confirmées sont exclues de ces totaux.'
                  : 'Aucun billet confirmé pour cet événement pour le moment.'}
              </p>
            </div>
            <meter
              min={0}
              max={100}
              value={stats.data.checkInRate}
              aria-label="Taux de passage à l’entrée"
            />
            <p className="field-help">
              Mis à jour le{' '}
              {formatEventDate(new Date(stats.dataUpdatedAt).toISOString())} à{' '}
              {formatEventTime(new Date(stats.dataUpdatedAt).toISOString())} ·
              Tunis. Utilisez « Actualiser » pour relire les totaux.
            </p>
          </section>
          <section className="workspace-section">
            <div className="workspace-section-title">
              <h2>Par tarif</h2>
            </div>
            {stats.data.byType.length ? (
              <div className="attendance-breakdown">
                {stats.data.byType.map((tier, index) => (
                  <div key={`${tier.ticketTypeName}-${index}`}>
                    <div>
                      <h3>{tier.ticketTypeName}</h3>
                      <p>
                        {tier.checkedIn} entrée(s) sur {tier.total} billet(s)
                        confirmé(s)
                      </p>
                    </div>
                    <strong>{tier.rate} %</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                Les tarifs apparaîtront après confirmation des premiers billets.
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}
