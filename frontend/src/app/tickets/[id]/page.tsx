import { TicketDetailPageContent } from '@/components/design/ticket-detail'
export const metadata = { title: 'Mon billet' }
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <TicketDetailPageContent id={(await params).id} />
}
