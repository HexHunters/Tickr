import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

import { EventCard } from '@/components/design/event-card'
import { DataState } from '@/components/design/data-state'
import { getUpcomingPublicEvents } from '@/lib/api/catalog'
import { toEventView } from '@/lib/api/contracts'
import { collections } from '@/lib/programme'
import { publicMetadata } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = collections.find((item) => item.slug === slug)
  if (!collection) notFound()
  return publicMetadata(
    `${collection.label} en Tunisie`,
    collection.description,
    `/programme/${collection.slug}`,
  )
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = collections.find((item) => item.slug === slug)
  if (!collection) notFound()
  const result = await getUpcomingPublicEvents(collection.category, 6).catch(
    () => null,
  )
  return (
    <main id="contenu" tabIndex={-1}>
      <section className={`collection-hero collection-${collection.tone}`}>
        <div className="collection-copy">
          <Link prefetch={false} className="back-link" href="/events">
            Le programme / {collection.label}
          </Link>
          <h1>{collection.title}</h1>
          <p>{collection.introduction}</p>
          <a className="button button-primary" href="#programme">
            Voir les prochaines dates <ArrowRightIcon />
          </a>
        </div>
        <div className="collection-photo">
          <Image
            src={collection.photo}
            alt="Une scène live. Photographie illustrative."
            fill
            sizes="(max-width: 760px) 100vw, 48vw"
            priority
          />
          <span>Ça se vit dehors.</span>
        </div>
      </section>
      <section className="container collection-programme" id="programme">
        <div className="section-heading">
          <div>
            <p className="section-caption">{collection.label} en Tunisie</p>
            <h2>Les prochaines dates.</h2>
          </div>
          <Link
            prefetch={false}
            className="text-link"
            href={`/events?category=${collection.category}`}
          >
            Tout voir <ArrowRightIcon />
          </Link>
        </div>
        {!result ? (
          <DataState error={null} />
        ) : result.data.length ? (
          <div className="event-grid">
            {result.data.map((event) => (
              <EventCard key={event.id} event={toEventView(event)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>La suite du programme arrive.</h3>
            <p>Aucune date publiée dans cette catégorie pour le moment.</p>
            <Link
              prefetch={false}
              className="button button-outline"
              href="/events"
            >
              Explorer les autres sorties
            </Link>
          </div>
        )}
      </section>
      <nav
        className="container collection-explore"
        aria-label="D’autres envies"
      >
        <h2>Et sinon ?</h2>
        {collections
          .filter((item) => item.slug !== slug)
          .map((item) => (
            <Link
              prefetch={false}
              href={`/programme/${item.slug}`}
              key={item.slug}
            >
              {item.label}
              <ArrowRightIcon />
            </Link>
          ))}
      </nav>
    </main>
  )
}
