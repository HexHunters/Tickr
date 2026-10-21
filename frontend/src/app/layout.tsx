import localFont from 'next/font/local'

import { siteDescription, siteUrl, isIndexable } from '@/lib/seo'

import { Providers } from '@/components/providers'
import { SiteHeader } from '@/components/design/site-shell'
import { SiteFooter } from '@/components/design/site-footer'

import type { Metadata } from 'next'

import './globals.css'

const manrope = localFont({
  src: '../../public/brand/fonts/manrope-latin.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--font-manrope',
})
const readex = localFont({
  src: '../../public/brand/fonts/readex-latin.woff2',
  weight: '400 700',
  display: 'swap',
  variable: '--font-readex',
})

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  icons: { icon: '/brand/symbol.svg' },
  title: { default: 'Tickr · Ça se vit dehors.', template: '%s · Tickr' },
  description: siteDescription,
  robots: { index: isIndexable(), follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr-TN"
      dir="ltr"
      className={`${manrope.variable} ${readex.variable}`}
    >
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
