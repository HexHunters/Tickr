import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  MusicalNoteIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import { DataState } from '@/components/design/data-state'
import { EventPoster } from '@/components/design/event-card'
import { TicketSelector } from '@/components/design/ticket-selector'
import {
  eventDetailSchema,
  publicConfigSchema,
  toEventView,
} from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/request'
import { serverApi } from '@/lib/api/server'
import { formatEventDate, formatEventTime, formatMoney } from '@/lib/format'

import type { EventDetail, PublicConfig } from '@/lib/api/contracts'

export const metadata = { title: 'L’événement' }
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let detail: EventDetail
  let config: PublicConfig | null = null
  try {
    detail = await serverApi(
      `events/${encodeURIComponent(id)}`,
      eventDetailSchema,
    )
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound()
    return (
      <main id="contenu" className="container" tabIndex={-1}>
        <DataState error={null} />
      </main>
    )
  }
  try {
    config = await serverApi(
      `config/public?eventId=${encodeURIComponent(id)}`,
      publicConfigSchema,
    )
  } catch {
    /* Availability is withheld when configuration cannot be verified. */
  }
  const event = toEventView(detail)
  const organizer =
    detail.organizer.displayName ||
    `${detail.organizer.firstName} ${detail.organizer.lastName}`
  return (
    <main id="contenu" tabIndex={-1}>
      <div className="container">
        <Link className="back-link" href="/events">
          <ArrowLeftIcon />
          Retour au programme
        </Link>
      </div>
      <section className="container event-detail-hero">
        <div className="detail-poster">
          <EventPoster event={event} priority />
        </div>
        <div className="detail-overview">
          <p className="detail-category">
            <MusicalNoteIcon />
            {event.category}
          </p>
          <h1>{event.title}</h1>
          <div className="detail-price-line">
            <span>
              À partir de{' '}
              <strong>
                <bdi>{formatMoney(event.priceMillimes, event.currency)}</bdi>
              </strong>
            </span>
            <span
              className={`status-pill ${event.isSoldOut ? 'status-neutral' : 'status-success'}`}
            >
              {event.isSoldOut
                ? 'Complet'
                : event.isOnSale
                  ? 'Places disponibles'
                  : 'Vente fermée'}
            </span>
          </div>
          <dl className="event-facts">
            <div>
              <CalendarDaysIcon />
              <dt>Le rendez-vous</dt>
              <dd>{formatEventDate(event.startsAt, true)}</dd>
            </div>
            <div>
              <ClockIcon />
              <dt>On se retrouve à</dt>
              <dd>
                {formatEventTime(event.startsAt)} <span>· Heure de Tunis</span>
              </dd>
            </div>
            <div>
              <MapPinIcon />
              <dt>La scène</dt>
              <dd>
                {event.venue}
                <span>{event.city}</span>
              </dd>
            </div>
          </dl>
          <a
            className="button button-primary detail-mobile-cta"
            href="#billetterie"
          >
            Voir les billets
          </a>
          <div className="organizer-byline">
            <span className="organizer-avatar">{organizer.slice(0, 1)}</span>
            <span>
              Une proposition de<strong>{organizer}</strong>
            </span>
          </div>
        </div>
      </section>
      <div className="container detail-body">
        <div className="event-story">
          <h2>La soirée, en quelques mots.</h2>
          <p className="event-description">
            {event.description ||
              'Retrouvez les informations pratiques ci-dessous.'}
          </p>
          <div className="practical-info">
            <h3>Avant de venir</h3>
            <p>
              <TicketIcon />
              Une réservation non payée ne permet pas l’entrée.
            </p>
            <p>
              <ClockIcon />
              Les dates et heures sont affichées dans le fuseau de Tunis.
            </p>
          </div>
          <details className="event-faq">
            <summary>Comment retrouver mes billets ?</summary>
            <p>
              Vos billets sont disponibles dans votre espace après confirmation
              du paiement. Vos réservations et leur statut se trouvent dans «
              Mes commandes ».
            </p>
            <Link href="/tickets" className="text-link">
              Retrouver mes billets
            </Link>
          </details>
        </div>
        <TicketSelector event={detail} config={config} />
      </div>
    </main>
  )
}
