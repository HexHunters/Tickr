import Link from 'next/link'

export function AccountNavigation({
  active,
}: {
  active: 'orders' | 'tickets' | 'account' | 'notifications' | 'messages'
}) {
  return (
    <nav className="account-navigation" aria-label="Mon espace">
      <Link
        href="/tickets"
        aria-current={active === 'tickets' ? 'page' : undefined}
      >
        Mes billets
      </Link>
      <Link
        href="/orders"
        aria-current={active === 'orders' ? 'page' : undefined}
      >
        Mes commandes
      </Link>
      <Link
        href="/account"
        aria-current={active === 'account' ? 'page' : undefined}
      >
        Mon compte
      </Link>
      <Link
        href="/account/notifications"
        aria-current={active === 'notifications' ? 'page' : undefined}
      >
        Mes notifications
      </Link>
      <Link
        href="/account/messages"
        prefetch={false}
        aria-current={active === 'messages' ? 'page' : undefined}
      >
        Mes messages
      </Link>
      <Link href="/check-in" prefetch={false}>
        Contrôle d’entrée
      </Link>
    </nav>
  )
}
