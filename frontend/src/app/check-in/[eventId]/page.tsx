import { TicketValidationPage } from '@/components/entrance/ticket-validation'

export const metadata = { title: 'Valider les billets' }
export default async function CheckInEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  return <TicketValidationPage key={eventId} id={eventId} />
}
