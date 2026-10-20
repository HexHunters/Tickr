'use client'
import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  LockClosedIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { EventPoster } from '@/components/design/event-card'
import {
  eventDetailSchema,
  orderSchema,
  paginated,
  publicConfigSchema,
  toEventView,
} from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime, formatMoney } from '@/lib/format'

import type { Order } from '@/lib/api/contracts'

const statusLabels: Record<Order['status'], string> = {
  PENDING: 'À régler',
  PROCESSING: 'Vérification du paiement',
  PAID: 'Paiement confirmé',
  FAILED: 'Paiement échoué',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
}
export function OrderStatus({ status }: { status: Order['status'] }) {
  return (
    <span
      className={`status-pill ${status === 'PAID' ? 'status-success' : ['PENDING', 'PROCESSING'].includes(status) ? 'status-warning' : 'status-neutral'}`}
    >
      {status === 'PAID' ? <CheckCircleIcon /> : <ClockIcon />}
      {statusLabels[status]}
    </span>
  )
}

function subscribeClock(notify: () => void) {
  const timer = setInterval(notify, 30000)
  return () => clearInterval(timer)
}
function clockSnapshot() {
  return Math.floor(Date.now() / 30000) * 30000
}

export function ReservationDeadline({ expiresAt }: { expiresAt: string }) {
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, () => 0)
  const remaining =
    now === null
      ? null
      : Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60000))
  return (
    <div className="reservation-deadline">
      <ClockIcon />
      <div>
        <strong>
          {remaining === 0
            ? 'Le délai de réservation est écoulé'
            : 'Votre réservation est en attente'}
        </strong>
        <p>
          Échéance : {formatEventDate(expiresAt, true)} à{' '}
          {formatEventTime(expiresAt)} · Tunis
        </p>
        {remaining !== null && remaining > 0 && (
          <p aria-live="off">{remaining} min restantes</p>
        )}
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const event = useQuery({
    queryKey: ['event', order.eventId],
    queryFn: () => requestApi(`events/${order.eventId}`, eventDetailSchema),
    retry: false,
  })
  return (
    <article className="order-row">
      <div className="order-row-heading">
        <OrderStatus status={order.status} />
        <span className="ticket-reference">{order.id}</span>
      </div>
      <div className="row-between">
        <div>
          <h2>{event.data?.title ?? 'Votre événement'}</h2>
          <p>
            {event.data
              ? `${formatEventDate(event.data.startDate)} · ${event.data.location.city}`
              : `Référence événement : ${order.eventId}`}
          </p>
          <p>
            {order.items.reduce((n, item) => n + item.quantity, 0)} billet(s) ·{' '}
            {formatEventDate(order.createdAt)}
          </p>
        </div>
        <strong>
          <bdi>
            {formatMoney(Math.round(order.total * 1000), order.currency)}
          </bdi>
        </strong>
      </div>
      <Link className="text-link" href={`/orders/${order.id}`}>
        Voir ma commande
        <ArrowRightIcon />
      </Link>
    </article>
  )
}

function OrdersContent() {
  const [page, setPage] = useState(1)
  const result = useQuery({
    queryKey: ['orders', page],
    queryFn: () =>
      requestApi(`orders?page=${page}&limit=10`, paginated(orderSchema)),
    retry: false,
  })
  if (result.isPending)
    return <LoadingState label="Chargement de vos commandes…" />
  if (result.isError)
    return (
      <DataState error={result.error} onRetry={() => void result.refetch()} />
    )
  if (!result.data.data.length)
    return (
      <div className="empty-state">
        <TicketIcon />
        <h2>La première fois reste à écrire.</h2>
        <p>Vos réservations apparaîtront ici.</p>
        <Link className="button button-primary" href="/events">
          Trouver ma prochaine sortie
          <ArrowRightIcon />
        </Link>
      </div>
    )
  return (
    <>
      <div className="orders-list">
        {result.data.data.map((order) => (
          <OrderRow order={order} key={order.id} />
        ))}
      </div>
      <div className="pagination">
        <button
          className="button button-outline"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Précédent
        </button>
        <span>
          Page {page} sur {Math.max(result.data.totalPages, 1)}
        </span>
        <button
          className="button button-outline"
          disabled={page >= result.data.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </button>
      </div>
    </>
  )
}
export function OrdersPageContent() {
  return (
    <main id="contenu" tabIndex={-1} className="container account-main">
      <div className="account-page-heading">
        <p className="section-caption">Vos rendez-vous</p>
        <h1>Mes commandes.</h1>
        <p>Chaque réservation, avec sa prochaine étape.</p>
      </div>
      <AccountNavigation active="orders" />
      <SessionGate>
        <OrdersContent />
      </SessionGate>
    </main>
  )
}
export function AccountNavigation({
  active,
}: {
  active: 'orders' | 'tickets' | 'account'
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
    </nav>
  )
}

function OrderDetails({ id, isCheckout }: { id: string; isCheckout: boolean }) {
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => requestApi(`orders/${encodeURIComponent(id)}`, orderSchema),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSING' ? 5000 : false,
  })
  const eventId = order.data?.eventId
  const event = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => requestApi(`events/${eventId}`, eventDetailSchema),
    enabled: Boolean(eventId),
    retry: false,
  })
  const config = useQuery({
    queryKey: ['payment-config', eventId],
    queryFn: () =>
      requestApi(`config/public?eventId=${eventId}`, publicConfigSchema),
    enabled: Boolean(eventId),
    retry: false,
  })
  if (order.isPending)
    return <LoadingState label="Ouverture de votre réservation…" />
  if (order.isError)
    return (
      <DataState error={order.error} onRetry={() => void order.refetch()} />
    )
  const data = order.data
  const count = data.items.reduce((n, item) => n + item.quantity, 0)
  return (
    <div className="checkout-layout">
      <div className="checkout-content">
        <OrderStatus status={data.status} />
        <h2 className="order-detail-title">
          {event.data?.title ?? 'Votre réservation'}
        </h2>
        {event.data && (
          <div className="checkout-event">
            <div className="checkout-poster">
              <EventPoster event={toEventView(event.data)} />
            </div>
            <div>
              <p>
                {formatEventDate(event.data.startDate, true)} ·{' '}
                {formatEventTime(event.data.startDate)}
              </p>
              <p>
                {event.data.location.address} · {event.data.location.city}
              </p>
              <Link className="text-link" href={`/events/${eventId}`}>
                Voir l’événement
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        )}
        {event.isError && (
          <p className="field-help">
            La fiche de l’événement est indisponible. Le récapitulatif de la
            commande reste accessible.
          </p>
        )}
        <section className="order-items" aria-label="Vos billets">
          {data.items.map((item) => (
            <div className="checkout-line" key={item.id}>
              <div>
                <strong>{item.ticketTypeName}</strong>
                <p>
                  {item.quantity} ×{' '}
                  <bdi>
                    {formatMoney(
                      Math.round(item.unitPrice * 1000),
                      data.currency,
                    )}
                  </bdi>
                </p>
              </div>
              <bdi>
                {formatMoney(Math.round(item.lineTotal * 1000), data.currency)}
              </bdi>
            </div>
          ))}
        </section>
        {data.status === 'PENDING' && (
          <ReservationDeadline expiresAt={data.expiresAt} />
        )}
        <div className="order-reference">
          <span>Référence de commande</span>
          <bdi>{data.id}</bdi>
        </div>
        <section className="payment-section">
          <h2>
            {data.status === 'PAID'
              ? 'Vous avez rendez-vous.'
              : 'La suite du parcours'}
          </h2>
          {data.status === 'PAID' ? (
            <div className="availability-message">
              <CheckCircleIcon />
              <div>
                <h3>Le paiement est confirmé</h3>
                <p>
                  Retrouvez vos billets et leurs codes d’entrée dans votre
                  espace.
                </p>
                <Link href="/tickets" className="text-link">
                  Retrouver mes billets
                  <ArrowRightIcon />
                </Link>
              </div>
            </div>
          ) : data.status === 'PROCESSING' ? (
            <div className="availability-message" role="status">
              <ClockIcon />
              <div>
                <h3>Vérification du paiement en cours</h3>
                <p>
                  Nous vérifions le statut auprès du service. Ne lancez pas de
                  nouveau paiement. Vous pouvez retrouver cette commande dans
                  votre espace.
                </p>
              </div>
            </div>
          ) : data.status === 'PENDING' ? (
            <div className="availability-message">
              <InformationCircleIcon />
              <div>
                <h3>
                  {config.data?.availablePaymentMethods.length
                    ? 'Consultez les consignes de votre organisateur'
                    : 'Aucun moyen de paiement disponible'}
                </h3>
                <p>
                  {config.data?.availablePaymentMethods.length
                    ? 'La réservation est créée. Le règlement en ligne n’est pas encore proposé dans cette interface.'
                    : 'Le paiement est momentanément indisponible pour cette réservation. Son statut reste « À régler » jusqu’à confirmation du serveur.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="availability-message">
              <InformationCircleIcon />
              <div>
                <h3>{statusLabels[data.status]}</h3>
                <p>
                  Cette commande ne permet pas de présenter un billet d’entrée.
                  Retrouvez son statut et vos autres sorties dans votre espace.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      <aside className="order-summary">
        <div className="summary-top">
          <span className="mini-perforation" />
          <h2>On récapitule.</h2>
          <span className="demo-label">{count} billet(s)</span>
        </div>
        <div className="summary-lines">
          <div>
            <span>Billets</span>
            <bdi>
              {formatMoney(Math.round(data.subtotal * 1000), data.currency)}
            </bdi>
          </div>
          <div>
            <span>Frais de service</span>
            <bdi>
              {formatMoney(Math.round(data.platformFee * 1000), data.currency)}
            </bdi>
          </div>
          <div>
            <span>Frais de paiement</span>
            <bdi>
              {formatMoney(Math.round(data.paymentFees * 1000), data.currency)}
            </bdi>
          </div>
        </div>
        <div className="summary-total">
          <span>
            {data.status === 'PAID' ? 'Total payé' : 'Total de la commande'}
          </span>
          <strong>
            <bdi>
              {formatMoney(Math.round(data.total * 1000), data.currency)}
            </bdi>
          </strong>
        </div>
        <p className="summary-disclaimer">
          Montants confirmés pour cette commande. Une réservation ne confirme
          pas le paiement ni le droit d’entrée.
        </p>
        {data.status === 'PAID' ? (
          <Link href="/tickets" className="button button-primary full-width">
            Voir mes billets
            <ArrowRightIcon />
          </Link>
        ) : (
          <button className="button button-primary full-width" disabled>
            <LockClosedIcon />
            {data.status === 'PROCESSING'
              ? 'Vérification en cours'
              : 'Paiement indisponible'}
          </button>
        )}
        <Link
          className="text-link summary-return"
          href={isCheckout ? `/orders/${data.id}` : '/orders'}
        >
          {isCheckout ? 'Voir ma commande' : 'Toutes mes commandes'}
          <ArrowRightIcon />
        </Link>
      </aside>
    </div>
  )
}
export function OrderDetailPageContent({
  id,
  isCheckout = false,
}: {
  id: string
  isCheckout?: boolean
}) {
  return (
    <main id="contenu" tabIndex={-1} className="container checkout-main">
      <Link href="/orders" className="back-link">
        <ArrowLeftIcon />
        Mes commandes
      </Link>
      <div className="checkout-title">
        <h1>
          {isCheckout ? (
            <>
              Votre sortie
              <br />
              se précise.
            </>
          ) : (
            'Votre commande.'
          )}
        </h1>
        <p>Les informations de votre réservation, au même endroit.</p>
      </div>
      <SessionGate>
        <OrderDetails id={id} isCheckout={isCheckout} />
      </SessionGate>
    </main>
  )
}
