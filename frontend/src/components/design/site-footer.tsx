import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRightIcon } from '@heroicons/react/24/outline'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div>
          <Link prefetch={false} href="/" aria-label="Tickr, accueil">
            <Image
              src="/brand/wordmark.svg"
              alt="Tickr"
              width={125}
              height={36}
            />
          </Link>
          <p>On se retrouve dehors.</p>
        </div>
        <nav aria-label="Navigation de pied de page">
          <Link prefetch={false} href="/events">
            Trouver une sortie <ArrowUpRightIcon />
          </Link>
          <Link prefetch={false} href="/tickets">
            Retrouver mes billets <ArrowUpRightIcon />
          </Link>
          <Link prefetch={false} href="/organizer">
            Espace organisateur <ArrowUpRightIcon />
          </Link>
          <Link prefetch={false} href="/help">
            Besoin d’aide <ArrowUpRightIcon />
          </Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>Fait pour les moments qu’on vit ensemble.</span>
        <span>Tunisie · Français · TND</span>
      </div>
    </footer>
  )
}
