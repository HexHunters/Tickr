import Link from 'next/link'
import { ArrowRightIcon, TicketIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <main
      id="contenu"
      tabIndex={-1}
      className="container empty-state not-found"
    >
      <TicketIcon />
      <p className="section-caption">Page introuvable</p>
      <h1>Cette scène reste à trouver.</h1>
      <p>Ce lien ne correspond à aucune page disponible.</p>
      <Link className="button button-primary" href="/events">
        Retrouver le programme
        <ArrowRightIcon />
      </Link>
    </main>
  )
}
