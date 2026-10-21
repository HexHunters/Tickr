import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRightIcon, MapPinIcon } from '@heroicons/react/24/outline'

import { formatEventDate, formatEventTime, formatMoney } from '@/lib/format'

import type { EventView } from '@/lib/api/contracts'

export function EventPoster({
  event,
  priority = false,
  sizes = '(max-width: 600px) 100vw, (max-width: 900px) 50vw, (max-width: 1240px) 33vw, 400px',
}: {
  event: EventView
  priority?: boolean
  sizes?: string
}) {
  return (
    <div
      className={`event-poster ${event.image ? 'poster-upload' : 'poster-fallback'}`}
      aria-hidden="true"
    >
      {event.image ? (
        <Image
          src={event.image}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          fetchPriority={priority ? 'high' : undefined}
          unoptimized={!event.image.startsWith('/')}
        />
      ) : (
        <>
          <span className="poster-topline">{event.category}</span>
          <strong className="poster-title">{event.title}</strong>
          <span className="poster-bottomline">{event.city}</span>
        </>
      )}
    </div>
  )
}
export function EventCard({
  event,
  priority = false,
}: {
  event: EventView
  priority?: boolean
}) {
  return (
    <article className="event-card">
      <Link
        href={`/events/${event.id}`}
        prefetch={false}
        className="event-card-link"
      >
        <div className="card-art">
          <EventPoster event={event} priority={priority} />
          <span className="category-tag">{event.category}</span>
          {event.isSoldOut && <span className="sold-out-tag">Complet</span>}
          <span className="card-open">
            <ArrowUpRightIcon />
          </span>
        </div>
        <div className="event-card-info">
          <p className="card-date">
            {formatEventDate(event.startsAt)} <span aria-hidden="true">/</span>{' '}
            {formatEventTime(event.startsAt)}
          </p>
          <h3>{event.title}</h3>
          <p className="card-location">
            <MapPinIcon />
            {event.city} · {event.venue.split(' · ')[0]}
          </p>
          <div className="card-price">
            <span>
              {event.isSoldOut
                ? 'Toutes les places sont parties'
                : 'À partir de'}
            </span>
            <bdi>{formatMoney(event.priceMillimes, event.currency)}</bdi>
          </div>
        </div>
      </Link>
    </article>
  )
}
