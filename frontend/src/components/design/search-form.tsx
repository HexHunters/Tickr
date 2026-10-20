'use client'
import { useState } from 'react'
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

export function SearchForm() {
  const [query, setQuery] = useState('')
  return (
    <form action="/events" className="home-search" role="search">
      <label className="search-query">
        <MagnifyingGlassIcon />
        <span>
          <span className="field-caption">Qu’est-ce qui vous tente ?</span>
          <input
            name="query"
            type="search"
            placeholder="Un concert, un spectacle…"
            aria-label="Rechercher un événement"
            maxLength={200}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
      </label>
      <label className="search-city">
        <MapPinIcon />
        <span>
          <span className="field-caption">
            {query ? 'Recherche dans toutes les villes' : 'Où ça ?'}
          </span>
          <input
            name="city"
            aria-label="Choisir une ville"
            placeholder="Toute la Tunisie"
            disabled={Boolean(query.trim())}
            maxLength={100}
          />
        </span>
      </label>
      <button className="button button-electric" type="submit">
        Trouver ma sortie
        <ArrowRightIcon />
      </button>
    </form>
  )
}
