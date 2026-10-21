import Link from 'next/link'
import {
  ArrowRightIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

import { EventCard } from '@/components/design/event-card'
import { DataState } from '@/components/design/data-state'
import { categoryLabels, toEventView } from '@/lib/api/contracts'
import { getPublicEvents } from '@/lib/api/catalog'
import { discoveryHref, discoveryPath } from '@/lib/programme'

import type { DiscoveryFilters } from '@/lib/programme'

export async function EventDiscovery({
  filters,
}: {
  filters: DiscoveryFilters
}) {
  const result = await getPublicEvents(discoveryPath(filters)).catch(() => null)
  const hasFilters = Boolean(filters.query || filters.category || filters.city)
  return (
    <main id="contenu" tabIndex={-1} className="discovery-main">
      <div className="discovery-intro">
        <div className="container">
          <p className="section-caption">Le programme</p>
          <div className="discovery-title">
            <h1>À vous de sortir.</h1>
            <p>
              Des scènes à découvrir.
              <br />
              Des soirées à se raconter.
            </p>
          </div>
        </div>
      </div>
      <section className="container discovery-content" aria-label="Événements">
        <h2 className="sr-only">Les événements du programme</h2>
        <form
          action="/events"
          method="get"
          className="discovery-controls"
          role="search"
        >
          <label className="input-with-icon">
            <MagnifyingGlassIcon />
            <input
              type="search"
              name="query"
              defaultValue={filters.query}
              aria-label="Rechercher dans le programme"
              placeholder="Un événement, une envie…"
              maxLength={200}
            />
          </label>
          <label className="select-with-icon">
            <MapPinIcon />
            <input
              name="city"
              defaultValue={filters.city}
              aria-label="Filtrer par ville"
              placeholder="Ville, ex. Tunis"
              maxLength={100}
            />
          </label>
          <label className="discovery-sort">
            Trier par
            <select
              name="sort"
              className="date-filter"
              defaultValue={filters.sort}
            >
              <option value="startDate">Date</option>
              <option value="title">Nom</option>
            </select>
          </label>
          {filters.category && (
            <input type="hidden" name="category" value={filters.category} />
          )}
          <button className="button button-primary">
            Rechercher <ArrowRightIcon />
          </button>
        </form>
        <p className="field-help search-hint">
          La recherche par nom explore toutes les villes. Pour filtrer par ville
          ou catégorie, laissez le nom vide.
        </p>
        <nav className="discovery-categories" aria-label="Catégories">
          {['', 'CONCERT', 'FESTIVAL', 'THEATER', 'COMEDY', 'WORKSHOP'].map(
            (category) => (
              <Link
                prefetch={false}
                key={category}
                className={`filter-chip ${filters.category === category && !filters.query ? 'is-active' : ''}`}
                aria-current={
                  filters.category === category && !filters.query
                    ? 'page'
                    : undefined
                }
                href={discoveryHref({
                  ...filters,
                  query: '',
                  category,
                  page: 1,
                })}
              >
                {filters.category === category && !filters.query && (
                  <CheckIcon />
                )}
                {category ? categoryLabels[category] : 'Tout le programme'}
              </Link>
            ),
          )}
          {hasFilters && (
            <Link prefetch={false} className="reset-filters" href="/events">
              Réinitialiser
            </Link>
          )}
        </nav>
        <div className="results-heading">
          <p>
            <strong>{result?.total ?? '—'}</strong>{' '}
            {result?.total === 1
              ? 'événement à découvrir'
              : 'événements à découvrir'}
          </p>
        </div>
        {!result ? (
          <DataState error={null} />
        ) : result.data.length ? (
          <>
            <div className="event-grid">
              {result.data.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={toEventView(event)}
                  priority={index === 0}
                />
              ))}
            </div>
            <nav className="pagination" aria-label="Pages du programme">
              {filters.page > 1 ? (
                <Link
                  prefetch={false}
                  className="button button-outline"
                  href={discoveryHref({ ...filters, page: filters.page - 1 })}
                >
                  Précédent
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {filters.page} sur {Math.max(result.totalPages, 1)}
              </span>
              {filters.page < result.totalPages ? (
                <Link
                  prefetch={false}
                  className="button button-outline"
                  href={discoveryHref({ ...filters, page: filters.page + 1 })}
                >
                  Suivant
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : (
          <div className="empty-state">
            <MagnifyingGlassIcon />
            <h2>Une autre envie ?</h2>
            <p>Aucun événement ne correspond à cette recherche.</p>
            <Link
              prefetch={false}
              className="button button-primary"
              href="/events"
            >
              Voir tout le programme
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
