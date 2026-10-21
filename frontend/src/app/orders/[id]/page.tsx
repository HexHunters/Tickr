import { OrderDetailPageContent } from '@/components/design/order-experience'
export const metadata = { title: 'Ma commande' }
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <OrderDetailPageContent id={(await params).id} />
}
