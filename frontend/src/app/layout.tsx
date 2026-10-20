import { Providers } from '@/components/providers'
import { SiteFooter, SiteHeader } from '@/components/design/site-shell'

import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  icons: { icon: '/brand/symbol.svg' },
  title: { default: 'Tickr · Ça se vit dehors.', template: '%s · Tickr' },
  description:
    'Trouvez vos prochaines sorties en Tunisie : concerts, festivals et spectacles. Réservez et retrouvez vos billets avec Tickr.',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-TN" dir="ltr">
      <body>
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
