import { TicketWallet } from '@/components/design/ticket-wallet'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes billets' }

export default function TicketsPage() {
  return <TicketWallet />
}
