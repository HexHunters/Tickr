'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircleIcon,
  ReceiptPercentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import { AdminPagination } from '@/components/admin/workspace'
import { DataState, LoadingState } from '@/components/design/data-state'
import { adminOrderSchema, refundResultSchema } from '@/lib/api/admin-contracts'
import { paginated } from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import {
  adminError,
  formatDinars,
  orderStatusLabels,
  paymentMethodLabels,
} from '@/lib/admin'
import { formatEventDate, formatEventTime } from '@/lib/format'

import type { FormEvent } from 'react'
import type { AdminOrder } from '@/lib/api/admin-contracts'

function RefundPanel({
  order,
  onDone,
}: {
  order: AdminOrder
  onDone: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const refund = useMutation({
    mutationFn: (reason: string) =>
      requestApi(`admin/orders/${order.id}/refund`, refundResultSchema, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      onDone(
        `La commande ${order.id.slice(0, 8)} est remboursée et ses billets sont annulés.`,
      )
    },
  })
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const reason = String(
      new FormData(formEvent.currentTarget).get('reason') || '',
    ).trim()
    if (reason) refund.mutate(reason)
  }
  return (
    <div className="admin-panel">
      <form className="admin-panel-form" onSubmit={submit}>
        <label className="full-width">
          Motif du remboursement
          <textarea
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={2}
            disabled={refund.isPending}
          />
        </label>
        <p className="field-help">
          Montant remboursé :{' '}
          {formatDinars(order.subtotal + order.paymentFees, order.currency)}. La
          commission Tickr ({formatDinars(order.platformFee, order.currency)})
          n’est pas remboursée. Les billets de la commande sont annulés.
        </p>
        <button
          className="button button-outline admin-danger"
          disabled={refund.isPending}
        >
          {refund.isPending ? 'Remboursement…' : 'Rembourser la commande'}
        </button>
      </form>
      {refund.isError && (
        <p className="form-error" role="alert">
          {adminError(refund.error)}
        </p>
      )}
    </div>
  )
}

export function AdminOrderList({ eventId }: { eventId?: string }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (status) params.set('status', status)
  if (eventId) params.set('eventId', eventId)
  const orders = useQuery({
    queryKey: ['admin', 'orders', params.toString()],
    queryFn: () =>
      requestApi(
        `admin/orders?${params.toString()}`,
        paginated(adminOrderSchema),
      ),
    retry: false,
  })
  const eventTitle = eventId
    ? orders.data?.data.find((order) => order.eventId === eventId)?.eventTitle
    : undefined
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">Commandes</p>
          <h1>Chaque vente, suivie de près.</h1>
          <p>
            Contrôlez les paiements, la commission prélevée et remboursez une
            commande si nécessaire.
          </p>
        </div>
      </div>
      <div className="admin-filters">
        <label>
          <span className="sr-only">Statut</span>
          <select
            value={status}
            onChange={(formEvent) => {
              setPage(1)
              setStatus(formEvent.target.value)
            }}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {eventId && (
          <Link className="filter-chip is-active" href="/admin/orders">
            {eventTitle || 'Un événement'}
            <XMarkIcon />
            <span className="sr-only">Retirer le filtre événement</span>
          </Link>
        )}
      </div>
      {notice && (
        <p className="form-success" role="status">
          <CheckCircleIcon />
          {notice}
        </p>
      )}
      <div className="workspace-section-title">
        <h2>Résultats</h2>
        <span>{orders.data ? `${orders.data.total} commandes` : '—'}</span>
      </div>
      {orders.isPending ? (
        <LoadingState />
      ) : orders.isError ? (
        <DataState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.data.length ? (
        <>
          <ul className="admin-list">
            {orders.data.data.map((order) => {
              const isOpen = openId === order.id
              return (
                <li key={order.id}>
                  <div className="admin-row">
                    <span className="admin-reference">
                      {order.id.slice(0, 8).toUpperCase()}
                      <span>
                        {formatEventDate(order.createdAt)},{' '}
                        {formatEventTime(order.createdAt)}
                      </span>
                    </span>
                    <div className="admin-row-main">
                      <span
                        className={`status-pill ${order.status === 'PAID' ? 'status-success' : order.status === 'PENDING' || order.status === 'PROCESSING' ? 'status-warning' : 'status-neutral'}`}
                      >
                        {orderStatusLabels[order.status] || order.status}
                      </span>
                      <h3>{order.eventTitle || 'Événement indisponible'}</h3>
                      <p>
                        {order.buyerName || 'Acheteur'}
                        {order.buyerEmail && ` · ${order.buyerEmail}`}
                      </p>
                      <p>
                        {order.ticketCount} billet
                        {order.ticketCount > 1 ? 's' : ''}
                        {order.paymentMethod &&
                          ` · ${paymentMethodLabels[order.paymentMethod] || order.paymentMethod}`}
                      </p>
                      {order.refundReason && (
                        <p>Motif du remboursement : {order.refundReason}</p>
                      )}
                    </div>
                    <dl className="admin-row-figures">
                      <div>
                        <dt>Total</dt>
                        <dd>{formatDinars(order.total, order.currency)}</dd>
                      </div>
                      <div>
                        <dt>Commission</dt>
                        <dd>
                          {formatDinars(order.platformFee, order.currency)}
                        </dd>
                      </div>
                    </dl>
                    <div className="admin-row-actions">
                      {order.status === 'PAID' && (
                        <button
                          className="button button-outline"
                          aria-expanded={isOpen}
                          onClick={() => {
                            setNotice('')
                            setOpenId(isOpen ? null : order.id)
                          }}
                        >
                          {isOpen ? 'Fermer' : 'Rembourser'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <RefundPanel
                      order={order}
                      onDone={(message) => {
                        setNotice(message)
                        setOpenId(null)
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          <AdminPagination
            page={page}
            totalPages={orders.data.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <div className="empty-state">
          <ReceiptPercentIcon />
          <h2>Aucune commande ne correspond.</h2>
          <p>Modifiez les filtres pour élargir la recherche.</p>
        </div>
      )}
    </>
  )
}
