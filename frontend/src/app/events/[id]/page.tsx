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
import { publicConfigSchema, toEventView } from '@/lib/api/contracts'
import { getPublicEvent } from '@/lib/api/catalog'
import { publicMetadata, eventStructuredData, serializeJsonLd } from '@/lib/seo'

import { ApiError } from '@/lib/api/request'
import { serverApi } from '@/lib/api/server'
import { formatEventDate, formatEventTime, formatMoney } from '@/lib/format'

import type { EventDetail } from '@/lib/api/contracts'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  try {
    const event = await getPublicEvent(id)
    return publicMetadata(
      `${event.title} à ${event.location.city}`,
      (
        event.description ||
        `${event.title} à ${event.location.city}. Dates, lieu et informations de billetterie sur Tickr.`
      ).slice(0, 160),
      `/events/${encodeURIComponent(id)}`,
      event.imageUrl || '/images/social-card.png',
    )
  } catch (error) {
    if (error instanceof ApiError && [400, 403, 404].includes(error.status))
      notFound()
    return {
      title: 'Événement indisponible',
      robots: { index: false, follow: false },
    }
  }
}
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let detail: EventDetail
  const configRequest = serverApi(
    `config/public?eventId=${encodeURIComponent(id)}`,
    publicConfigSchema,
  ).catch(() => null)
  try {
    detail = await getPublicEvent(id)
  } catch (error) {
    if (error instanceof ApiError && [400, 403, 404].includes(error.status))
      notFound()
    return (
      <main id="contenu" className="container" tabIndex={-1}>
        <DataState error={null} />
      </main>
    )
  }
  const config = await configRequest
  const event = toEventView(detail)
  const organizer =
    detail.organizer.displayName ||
    `${detail.organizer.firstName} ${detail.organizer.lastName}`
  return (
    <main id="contenu" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(eventStructuredData(detail)),
        }}
      />
      <div className="container">
        <Link prefetch={false} className="back-link" href="/events">
          <ArrowLeftIcon />
          Retour au programme
        </Link>
      </div>
      <section className="container event-detail-hero">
        <div className="detail-poster">
          <EventPoster
            event={event}
            priority
            sizes="(max-width: 760px) 100vw, (max-width: 1100px) 45vw, 480px"
          />
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
