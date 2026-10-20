'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

import { EventCard } from '@/components/design/event-card'
import { DataState, LoadingState } from '@/components/design/data-state'
import {
  categoryLabels,
  eventListSchema,
  paginated,
  toEventView,
} from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'

export function EventDiscovery({
  initialQuery,
  initialCategory,
  initialCity,
}: {
  initialQuery: string
  initialCategory: string
  initialCity: string
}) {
  const [draft, setDraft] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory.toUpperCase())
  const [city, setCity] = useState(initialCity)
  const [sort, setSort] = useState('startDate')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page), limit: '12' })
  if (query) params.set('q', query)
  else {
    if (category) params.set('category', category)
    if (city) params.set('city', city)
    params.set('sortBy', sort)
    params.set('sortOrder', 'ASC')
  }
  const path = `events${query ? '/search' : ''}?${params}`
  const result = useQuery({
    queryKey: ['events', path],
    queryFn: () => requestApi(path, paginated(eventListSchema)),
    retry: false,
  })
  const hasFilters = Boolean(query || category || city)
  function resetFilters() {
    setDraft('')
    setQuery('')
    setCategory('')
    setCity('')
    setPage(1)
  }
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
        <div className="discovery-controls">
          <form
            className="input-with-icon"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              setQuery(draft.trim())
              setPage(1)
            }}
          >
            <MagnifyingGlassIcon />
            <input
              type="search"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                if (!event.target.value) {
                  setQuery('')
                  setPage(1)
                }
              }}
              aria-label="Rechercher dans le programme"
              placeholder="Un événement, une envie…"
              maxLength={200}
            />
            <button className="search-submit" aria-label="Lancer la recherche">
              <ArrowRightIcon />
            </button>
          </form>
          <label className="select-with-icon">
            <MapPinIcon />
            <input
              value={city}
              onChange={(event) => {
                setCity(event.target.value)
                setPage(1)
              }}
              aria-label="Filtrer par ville"
              placeholder="Ville, ex. Tunis"
              disabled={Boolean(query)}
              maxLength={100}
            />
          </label>
          {!query && (
            <label className="discovery-sort">
              Trier par
              <select
                className="date-filter"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value)
                  setPage(1)
                }}
              >
                <option value="startDate">Date de l’événement</option>
                <option value="title">Nom de l’événement</option>
              </select>
            </label>
          )}
        </div>
        {query && (
          <p className="field-help search-hint">
            Recherche par nom et description dans toutes les villes. Effacez la
            recherche pour filtrer le programme.
          </p>
        )}
        <div className="discovery-categories" aria-label="Catégories">
          {['', 'CONCERT', 'FESTIVAL', 'THEATER', 'COMEDY', 'WORKSHOP'].map(
            (item) => (
              <button
                key={item}
                className={`filter-chip ${category === item && !query ? 'is-active' : ''}`}
                aria-pressed={category === item && !query}
                disabled={Boolean(query)}
                onClick={() => {
                  setCategory(item)
                  setPage(1)
                }}
              >
                {category === item && !query && <CheckIcon />}
                {item ? categoryLabels[item] : 'Tout le programme'}
              </button>
            ),
          )}
          {hasFilters && (
            <button className="reset-filters" onClick={resetFilters}>
              <ArrowPathIcon />
              Réinitialiser
            </button>
          )}
        </div>
        <div className="results-heading">
          <p role="status">
            {result.data ? (
              <>
                <strong>{result.data.total}</strong>{' '}
                {result.data.total === 1
                  ? 'événement à découvrir'
                  : 'événements à découvrir'}
              </>
            ) : (
              'Le programme se prépare…'
            )}
          </p>
        </div>
        {result.isPending ? (
          <LoadingState label="Chargement du programme…" />
        ) : result.isError ? (
          <DataState
            error={result.error}
            onRetry={() => void result.refetch()}
          />
        ) : result.data.data.length ? (
          <>
            <div className="event-grid">
              {result.data.data.map((event, index) => (
                <EventCard
                  event={toEventView(event)}
                  priority={index < 3}
                  key={event.id}
                />
              ))}
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
            <MagnifyingGlassIcon />
            <h2>Une autre envie ?</h2>
            <p>Aucun événement ne correspond à cette recherche.</p>
            <button className="button button-primary" onClick={resetFilters}>
              Voir tout le programme
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
