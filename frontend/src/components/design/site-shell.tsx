'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/components/session-provider'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  ArrowUpRightIcon,
  Bars3Icon,
  TicketIcon,
  XMarkIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

export function SiteHeader() {
  const { user } = useSession()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigation = [
    { href: '/events', label: 'Découvrir' },
    { href: '/programme/festivals', label: 'Les festivals' },
    ...(user?.role === 'ORGANIZER'
      ? [{ href: '/organizer', label: 'Organiser' }]
      : []),
  ]
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <div className="preview-notice">
        Ça se vit dehors. <span aria-hidden="true">/</span> En scène, en
        Tunisie.
      </div>
      <header className="site-header container">
        <Link
          prefetch={false}
          href="/"
          aria-label="Tickr, accueil"
          className="brand-link"
        >
          <Image
            src="/brand/wordmark.svg"
            width={125}
            height={36}
            alt="Tickr"
            priority
          />
        </Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              aria-current={item.href === pathname ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          prefetch={false}
          href="/tickets"
          className="button button-outline header-tickets"
          aria-current={pathname === '/tickets' ? 'page' : undefined}
        >
          <TicketIcon />
          Mes billets
        </Link>
        <Link
          prefetch={false}
          className="account-avatar"
          href={user ? '/account' : '/auth/login'}
          aria-label={user ? 'Mon compte' : 'Se connecter'}
        >
          {user ? user.firstName.slice(0, 1) : <UserIcon />}
        </Link>
        <button
          className="icon-button mobile-menu-toggle"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Ouvrir la navigation"
        >
          <Bars3Icon />
        </button>
      </header>
      <Dialog
        open={isMenuOpen}
        onClose={setIsMenuOpen}
        className="mobile-dialog"
      >
        <div className="dialog-backdrop" aria-hidden="true" />
        <DialogPanel className="mobile-menu">
          <div className="row-between">
            <DialogTitle>Où on va ?</DialogTitle>
            <button
              className="icon-button"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Fermer la navigation"
            >
              <XMarkIcon />
            </button>
          </div>
          <nav aria-label="Navigation mobile">
            {[
              { href: '/', label: 'Accueil' },
              ...navigation,
              { href: '/tickets', label: 'Mes billets' },
              { href: '/orders', label: 'Mes commandes' },
              {
                href: user ? '/account' : '/auth/login',
                label: user ? 'Mon compte' : 'Se connecter',
              },
            ].map((item) => (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
                <ArrowUpRightIcon />
              </Link>
            ))}
          </nav>
          <p className="muted">Ça se vit dehors.</p>
        </DialogPanel>
      </Dialog>
    </>
  )
}
