import { OrderDetailPageContent } from '@/components/design/order-experience'
export const metadata = { title: 'Ma réservation' }
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  return <OrderDetailPageContent id={(await params).orderId} isCheckout />
}
