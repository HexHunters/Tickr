'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline'

import { SessionGate } from '@/components/design/data-state'
import { useSession } from '@/components/session-provider'

const sections = [
  { href: '/admin', label: 'Vue d’ensemble', icon: Squares2X2Icon },
  { href: '/admin/users', label: 'Comptes', icon: UsersIcon },
  { href: '/admin/events', label: 'Événements', icon: CalendarDaysIcon },
  { href: '/admin/orders', label: 'Commandes', icon: ReceiptPercentIcon },
]

function AdminAccess({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  if (user?.role !== 'ADMIN')
    return (
      <div className="empty-state">
        <ShieldCheckIcon />
        <h2>Un espace réservé à l’équipe Tickr.</h2>
        <p>Votre compte ne dispose pas des droits d’administration.</p>
        <Link className="button button-primary" href="/account">
          Voir mon compte
        </Link>
      </div>
    )
  return children
}

export function AdminWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <main id="contenu" tabIndex={-1} className="container workspace">
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" href="/admin">
          La régie.<span>Administration de la plateforme</span>
        </Link>
        <nav aria-label="Administration">
          {sections.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (
                  href === '/admin'
                    ? pathname === href
                    : pathname.startsWith(href)
                )
                  ? 'page'
                  : undefined
              }
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <Link prefetch={false} className="workspace-exit" href="/events">
          Voir le programme
          <ArrowUpRightIcon />
        </Link>
      </aside>
      <div className="workspace-content">
        <SessionGate>
          <AdminAccess>{children}</AdminAccess>
        </SessionGate>
      </div>
    </main>
  )
}

export function AdminPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button
        className="button button-outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Précédent
      </button>
      <span>
        Page {page} sur {totalPages}
      </span>
      <button
        className="button button-outline"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Suivant
      </button>
    </div>
  )
}
