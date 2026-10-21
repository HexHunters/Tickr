import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  MusicalNoteIcon,
  SparklesIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import { EventCard } from '@/components/design/event-card'
import { SearchForm } from '@/components/design/search-form'
import { toEventView } from '@/lib/api/contracts'
import { getUpcomingPublicEvents } from '@/lib/api/catalog'
import { publicMetadata, siteDescription } from '@/lib/seo'
import { DataState } from '@/components/design/data-state'
import type { EventView } from '@/lib/api/contracts'

export const metadata = {
  ...publicMetadata('Ça se vit dehors.', siteDescription, '/'),
  title: { absolute: 'Tickr · Ça se vit dehors.' },
}

export default async function HomePage() {
  let events: EventView[] = []
  let isUnavailable = false
  try {
    const response = await getUpcomingPublicEvents('', 3)
    events = response.data.map(toEventView)
  } catch {
    isUnavailable = true
  }
  return (
    <main id="contenu" tabIndex={-1}>
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="hero-intro">
            <span className="live-dot" />
            La prochaine sortie commence ici.
          </p>
          <h1 id="hero-title">
            Ça se vit
            <br />
            dehors.
          </h1>
          <p className="hero-description">
            Le son qui monte. Les lumières qui tombent.
            <br className="desktop-break" /> Les moments qui restent.
          </p>
          <Link prefetch={false} className="hero-text-link" href="/events">
            Trouvez votre prochaine scène
            <ArrowUpRightIcon />
          </Link>
          <div className="hero-footnote">
            <span className="hero-coordinate">TUN / 36°48′</span>
            <span>En vrai. Ensemble.</span>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/live-crowd.jpg"
            alt="L’énergie d’un public de concert, bras levés face à la scène. Photographie illustrative."
            fill
            priority
            sizes="(max-width: 760px) 100vw, 55vw"
          />
          <span className="hero-photo-caption">
            <MusicalNoteIcon />
            Le live, ça change tout.
          </span>
          <span className="hero-photo-index">En scène / 2026</span>
        </div>
      </section>
      <div className="container search-wrap">
        <SearchForm />
      </div>
      <section
        className="container home-programme"
        aria-labelledby="programme-title"
      >
        <div className="section-heading">
          <div>
            <p className="section-caption">La sélection Tickr</p>
            <h2 id="programme-title">On sort où ?</h2>
          </div>
          <Link prefetch={false} href="/events" className="text-link">
            Tout le programme
            <ArrowRightIcon />
          </Link>
        </div>
        <div className="home-categories" aria-label="Explorer par catégorie">
          <Link prefetch={false} className="category-link" href="/events">
            <SparklesIcon />
            Toutes les envies
          </Link>
          <Link prefetch={false} href="/programme/concerts">
            Concerts
          </Link>
          <Link prefetch={false} href="/programme/festivals">
            Festivals
          </Link>
          <Link prefetch={false} href="/programme/spectacles">
            Spectacles
          </Link>
          <Link prefetch={false} href="/programme/ateliers">
            Ateliers
          </Link>
        </div>
        {isUnavailable ? (
          <DataState error={null} />
        ) : events.length === 0 ? (
          <p className="empty-programme">
            Le programme arrive bientôt. Revenez découvrir les prochaines
            sorties.
          </p>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
      <section className="home-manifesto">
        <div className="container manifesto-inner">
          <TicketIcon />
          <h2>
            Moins de « on devrait ».
            <br />
            Plus de « on y était ».
          </h2>
          <Link
            prefetch={false}
            className="button button-electric"
            href="/events"
          >
            Allez, on sort
            <ArrowUpRightIcon />
          </Link>
        </div>
      </section>
    </main>
  )
}
