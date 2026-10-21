'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDaysIcon,
  Squares2X2Icon,
  PlusIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/outline'

import { SessionGate } from '@/components/design/data-state'
import { useSession } from '@/components/session-provider'

function OrganizerAccess({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  if (user?.role !== 'ORGANIZER')
    return (
      <div className="empty-state">
        <CalendarDaysIcon />
        <h2>Un espace pour les organisateurs.</h2>
        <p>
          Votre compte doit disposer du rôle organisateur pour gérer des
          événements.
        </p>
        <Link className="button button-primary" href="/account">
          Voir mon compte
        </Link>
      </div>
    )
  return children
}

export function OrganizerWorkspace({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <main id="contenu" tabIndex={-1} className="container workspace">
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" href="/organizer">
          Côté coulisses.<span>Votre espace organisateur</span>
        </Link>
        <nav aria-label="Espace organisateur">
          <Link
            href="/organizer"
            aria-current={pathname === '/organizer' ? 'page' : undefined}
          >
            <Squares2X2Icon />
            Vue d’ensemble
          </Link>
          <Link
            href="/organizer/events"
            aria-current={
              pathname.startsWith('/organizer/events') &&
              !pathname.endsWith('/new')
                ? 'page'
                : undefined
            }
          >
            <CalendarDaysIcon />
            Mes événements
          </Link>
          <Link
            href="/organizer/events/new"
            aria-current={pathname.endsWith('/new') ? 'page' : undefined}
          >
            <PlusIcon />
            Créer un événement
          </Link>
          <Link prefetch={false} href="/check-in">
            <ArrowUpRightIcon />
            Contrôle d’entrée
          </Link>
        </nav>
        <Link prefetch={false} className="workspace-exit" href="/events">
          Voir le programme
          <ArrowUpRightIcon />
        </Link>
      </aside>
      <div className="workspace-content">
        <SessionGate>
          <OrganizerAccess>{children}</OrganizerAccess>
        </SessionGate>
      </div>
    </main>
  )
}
