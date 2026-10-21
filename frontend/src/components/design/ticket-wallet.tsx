'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { EventPoster } from '@/components/design/event-card'
import { AccountNavigation } from '@/components/design/account-navigation'
import {
  eventDetailSchema,
  paginated,
  ticketSchema,
  toEventView,
} from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime } from '@/lib/format'

import type { Ticket } from '@/lib/api/contracts'

export function TicketStatus({ status }: { status: Ticket['status'] }) {
  const labels = {
    CONFIRMED: 'Billet confirmé',
    RESERVED: 'Réservation à régler',
    CHECKED_IN: 'Déjà utilisé',
    CANCELLED: 'Annulé',
    EXPIRED: 'Expiré',
  }
  return (
    <span
      className={`status-pill ${status === 'CONFIRMED' ? 'status-success' : status === 'RESERVED' ? 'status-warning' : 'status-neutral'}`}
    >
      {status === 'CONFIRMED' ? <CheckCircleIcon /> : <ClockIcon />}
      {labels[status]}
    </span>
  )
}
function WalletRow({ ticket }: { ticket: Ticket }) {
  const event = useQuery({
    queryKey: ['event', ticket.eventId],
    queryFn: () => requestApi(`events/${ticket.eventId}`, eventDetailSchema),
    retry: false,
  })
  return (
    <article className="wallet-ticket">
      <div className="wallet-poster">
        {event.data ? (
          <EventPoster event={toEventView(event.data)} />
        ) : (
          <div className="wallet-poster-empty">
            <TicketIcon />
          </div>
        )}
      </div>
      <div className="wallet-ticket-content">
        <div className="wallet-ticket-top">
          <TicketStatus status={ticket.status} />
          <span className="ticket-reference">{ticket.id}</span>
        </div>
        <h2>{event.data?.title ?? 'Votre événement'}</h2>
        {event.data ? (
          <>
            <p>
              <CalendarDaysIcon />
              {formatEventDate(event.data.startDate)} ·{' '}
              {formatEventTime(event.data.startDate)}
            </p>
            <p>
              <MapPinIcon />
              {event.data.location.city} · {event.data.location.address}
            </p>
          </>
        ) : (
          <p>Référence événement : {ticket.eventId}</p>
        )}
        <div className="wallet-ticket-bottom">
          <span>
            {ticket.holderName}
            {ticket.status === 'RESERVED' ? ' · Entrée non valable' : ''}
          </span>
          <Link
            className="button button-primary"
            href={`/tickets/${ticket.id}`}
          >
            {ticket.status === 'RESERVED'
              ? 'Voir la réservation'
              : 'Voir le billet'}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </article>
  )
}
function WalletContent() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const result = useQuery({
    queryKey: ['tickets', status, page],
    queryFn: () =>
      requestApi(
        `tickets?page=${page}&limit=6${status ? `&status=${status}` : ''}`,
        paginated(ticketSchema),
      ),
    retry: false,
  })
  return (
    <>
      <div
        className="wallet-tabs"
        role="tablist"
        aria-label="Filtrer les billets"
      >
        {[
          { value: '', label: 'Tous mes billets' },
          { value: 'CHECKED_IN', label: 'Déjà utilisés' },
        ].map((tab, index) => (
          <button
            key={tab.value}
            id={`wallet-tab-${index}`}
            role="tab"
            aria-selected={status === tab.value}
            aria-controls="wallet-panel"
            tabIndex={status === tab.value ? 0 : -1}
            onClick={() => {
              setStatus(tab.value)
              setPage(1)
            }}
            onKeyDown={(event) => {
              if (
                ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              ) {
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 1
                      : index === 0
                        ? 1
                        : 0
                setStatus(next === 0 ? '' : 'CHECKED_IN')
                setPage(1)
                document.getElementById(`wallet-tab-${next}`)?.focus()
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id="wallet-panel"
        role="tabpanel"
        aria-labelledby={`wallet-tab-${status ? 1 : 0}`}
        tabIndex={0}
      >
        {result.isPending ? (
          <LoadingState label="Chargement de vos billets…" />
        ) : result.isError ? (
          <DataState
            error={result.error}
            onRetry={() => void result.refetch()}
          />
        ) : result.data.data.length ? (
          <>
            <div className="wallet-layout">
              <div className="wallet-list">
                {result.data.data.map((ticket) => (
                  <WalletRow ticket={ticket} key={ticket.id} />
                ))}
              </div>
              <aside className="wallet-aside">
                <TicketIcon />
                <h2>
                  La soirée commence
                  <br />
                  avant la scène.
                </h2>
                <p>
                  Un billet devient disponible après confirmation du paiement.
                  Une réservation à régler ne permet pas l’entrée.
                </p>
                <Link href="/orders" className="text-link">
                  Mes commandes
                  <ArrowRightIcon />
                </Link>
              </aside>
            </div>
            <div className="pagination">
              <button
                className="button button-outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Précédent
              </button>
              <span>
                Page {page} sur {Math.max(result.data.totalPages, 1)}
              </span>
              <button
                className="button button-outline"
                disabled={page >= result.data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <TicketIcon />
            <h2>Tout est encore à vivre.</h2>
            <p>
              {status
                ? 'Aucun billet utilisé pour le moment.'
                : 'Vos prochains billets apparaîtront ici.'}
            </p>
            <Link href="/events" className="button button-primary">
              Trouver une sortie
              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
export function TicketWallet() {
  return (
    <main id="contenu" tabIndex={-1} className="wallet-main container">
      <div className="wallet-heading">
        <div>
          <p className="section-caption">Les prochaines fois</p>
          <h1>Mes billets.</h1>
          <p>Vos sorties, au même endroit.</p>
        </div>
        <Link href="/events" className="button button-outline">
          Une autre sortie ?<ArrowUpRightIcon />
        </Link>
      </div>
      <AccountNavigation active="tickets" />
      <SessionGate>
        <WalletContent />
      </SessionGate>
    </main>
  )
}
