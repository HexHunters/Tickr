'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

import { DataState, LoadingState } from '@/components/design/data-state'
import { useSession } from '@/components/session-provider'
import {
  adminOrderSchema,
  eventStatusCountsSchema,
  orderStatsSchema,
  userStatsSchema,
} from '@/lib/api/admin-contracts'
import { paginated } from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import {
  formatDinars,
  orderStatusLabels,
  roleLabels,
  summarizeOrders,
} from '@/lib/admin'
import { formatEventDate } from '@/lib/format'
import { eventStatusLabels } from '@/lib/organizer'

function Metric({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail && <p>{detail}</p>}
    </div>
  )
}

export function AdminOverview() {
  const { user } = useSession()
  const users = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: () => requestApi('admin/users/stats', userStatsSchema),
    retry: false,
  })
  const events = useQuery({
    queryKey: ['admin', 'event-stats'],
    queryFn: () => requestApi('admin/events/stats', eventStatusCountsSchema),
    retry: false,
  })
  const orders = useQuery({
    queryKey: ['admin', 'order-stats'],
    queryFn: () => requestApi('admin/orders/stats', orderStatsSchema),
    retry: false,
  })
  const latest = useQuery({
    queryKey: ['admin', 'orders', 'latest'],
    queryFn: () =>
      requestApi('admin/orders?page=1&limit=5', paginated(adminOrderSchema)),
    retry: false,
  })
  const failed = [users, events, orders].find((query) => query.isError)
  const sales = orders.data ? summarizeOrders(orders.data) : null

  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">Bonjour {user?.firstName || ''}</p>
          <h1>Toute la plateforme, d’un coup d’œil.</h1>
          <p>
            Comptes, événements et ventes : suivez l’activité et intervenez
            quand il le faut.
          </p>
        </div>
      </div>
      {failed ? (
        <DataState error={failed.error} onRetry={() => void failed.refetch()} />
      ) : !users.data || !events.data || !sales ? (
        <LoadingState />
      ) : (
        <>
          <section className="admin-section">
            <div className="workspace-section-title">
              <h2>Ventes</h2>
              <Link className="text-link" href="/admin/orders">
                Toutes les commandes
                <ArrowRightIcon />
              </Link>
            </div>
            <dl className="admin-metrics">
              <Metric
                label="Volume encaissé"
                value={formatDinars(sales.grossVolume)}
                detail={`${sales.paidCount} commandes payées`}
              />
              <Metric
                label="Commission Tickr"
                value={formatDinars(sales.commission)}
              />
              <Metric
                label="Remboursements"
                value={formatDinars(sales.refundedAmount)}
                detail={`${sales.refundedCount} commandes`}
              />
              <Metric label="Paiements en attente" value={sales.pendingCount} />
            </dl>
          </section>
          <section className="admin-section">
            <div className="workspace-section-title">
              <h2>Événements</h2>
              <Link className="text-link" href="/admin/events">
                Modérer
                <ArrowRightIcon />
              </Link>
            </div>
            <dl className="admin-metrics">
              {(['PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'] as const).map(
                (status) => (
                  <Metric
                    key={status}
                    label={eventStatusLabels[status]}
                    value={events.data[status]}
                  />
                ),
              )}
            </dl>
          </section>
          <section className="admin-section">
            <div className="workspace-section-title">
              <h2>Comptes</h2>
              <Link className="text-link" href="/admin/users">
                Gérer les comptes
                <ArrowRightIcon />
              </Link>
            </div>
            <dl className="admin-metrics">
              <Metric
                label="Comptes actifs"
                value={users.data.active}
                detail={`${users.data.inactive} suspendus`}
              />
              {(['PARTICIPANT', 'ORGANIZER', 'ADMIN'] as const).map((role) => (
                <Metric
                  key={role}
                  label={`${roleLabels[role]}s`}
                  value={users.data.byRole[role]}
                />
              ))}
            </dl>
          </section>
          <section className="admin-section">
            <div className="workspace-section-title">
              <h2>Dernières commandes</h2>
            </div>
            {latest.isPending ? (
              <LoadingState />
            ) : latest.isError ? (
              <DataState
                error={latest.error}
                onRetry={() => void latest.refetch()}
              />
            ) : latest.data.data.length ? (
              <ul className="admin-list">
                {latest.data.data.map((order) => (
                  <li key={order.id} className="admin-row">
                    <div className="admin-row-main">
                      <span
                        className={`status-pill ${order.status === 'PAID' ? 'status-success' : order.status === 'PENDING' || order.status === 'PROCESSING' ? 'status-warning' : 'status-neutral'}`}
                      >
                        {orderStatusLabels[order.status] || order.status}
                      </span>
                      <h3>{order.eventTitle || 'Événement indisponible'}</h3>
                      <p>
                        {order.buyerName || order.buyerEmail || 'Acheteur'} ·{' '}
                        {formatEventDate(order.createdAt)}
                      </p>
                    </div>
                    <strong className="admin-amount">
                      {formatDinars(order.total, order.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Aucune commande pour le moment.</p>
            )}
          </section>
        </>
      )}
    </>
  )
}
