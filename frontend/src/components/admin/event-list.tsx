'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

import { AdminPagination } from '@/components/admin/workspace'
import { DataState, LoadingState } from '@/components/design/data-state'
import {
  adminEventSchema,
  eventCommissionSchema,
  freeTicketsPolicySchema,
} from '@/lib/api/admin-contracts'
import { categoryLabels, paginated } from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import {
  adminError,
  formatDinars,
  formatRate,
  freeTicketsChoice,
  freeTicketsLabels,
  freeTicketsOverride,
  parseCommissionPercent,
} from '@/lib/admin'
import { formatEventDate, formatEventTime } from '@/lib/format'
import { eventStatusLabels } from '@/lib/organizer'

import type { FormEvent } from 'react'
import type { FreeTicketsChoice } from '@/lib/admin'
import type { AdminEvent } from '@/lib/api/admin-contracts'

function EventPanel({
  event,
  onDone,
}: {
  event: AdminEvent
  onDone: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState('')
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] })
  const commission = useMutation({
    mutationFn: (commissionRate: number | null) =>
      requestApi(`events/${event.id}/commission`, eventCommissionSchema, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRate }),
      }),
    onSuccess: async (result) => {
      await refresh()
      onDone(
        result.usesGlobalRate
          ? `« ${event.title} » applique de nouveau le taux global (${formatRate(result.effectiveCommissionRate)}).`
          : `La commission de « ${event.title} » passe à ${formatRate(result.effectiveCommissionRate)}.`,
      )
    },
  })
  const [freeChoice, setFreeChoice] = useState<FreeTicketsChoice>(
    freeTicketsChoice(event.freeTicketsEnabledOverride),
  )
  const freeTickets = useMutation({
    mutationFn: (enabled: boolean | null) =>
      requestApi(`events/${event.id}/free-tickets`, freeTicketsPolicySchema, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: async (result) => {
      await refresh()
      onDone(
        `Billets gratuits pour « ${event.title} » : ${result.effectiveFreeTicketsEnabled ? 'autorisés' : 'bloqués'}${result.freeTicketsEnabledOverride === null ? ' (politique globale)' : ''}.`,
      )
    },
  })
  const cancel = useMutation({
    mutationFn: (reason: string) =>
      requestApi(
        `admin/events/${event.id}/cancel`,
        z.object({ message: z.string() }),
        { method: 'POST', body: JSON.stringify({ reason }) },
      ),
    onSuccess: async () => {
      await refresh()
      onDone(
        `« ${event.title} » est annulé. Les commandes payées suivent le parcours de remboursement.`,
      )
    },
  })
  const isBusy =
    commission.isPending || freeTickets.isPending || cancel.isPending
  const canCancel = event.status === 'DRAFT' || event.status === 'PUBLISHED'
  function submitCommission(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setFormError('')
    cancel.reset()
    freeTickets.reset()
    try {
      commission.mutate(
        parseCommissionPercent(
          String(new FormData(formEvent.currentTarget).get('rate') || ''),
        ),
      )
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Taux invalide.')
    }
  }
  function submitFreeTickets(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    commission.reset()
    cancel.reset()
    freeTickets.mutate(freeTicketsOverride(freeChoice))
  }
  function submitCancel(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    commission.reset()
    freeTickets.reset()
    const reason = String(
      new FormData(formEvent.currentTarget).get('reason') || '',
    ).trim()
    if (reason) cancel.mutate(reason)
  }
  const error = commission.error || freeTickets.error || cancel.error
  return (
    <div className="admin-panel">
      <form className="admin-panel-form" onSubmit={submitCommission}>
        <label>
          Commission propre à l’événement (%)
          <input
            name="rate"
            inputMode="decimal"
            maxLength={5}
            disabled={isBusy}
            placeholder="Taux global"
            defaultValue={
              event.commissionRateOverride === null
                ? ''
                : String(Math.round(event.commissionRateOverride * 10000) / 100)
            }
          />
        </label>
        <button className="button button-primary" disabled={isBusy}>
          {commission.isPending ? 'Enregistrement…' : 'Appliquer'}
        </button>
        <p className="field-help">
          Laissez vide pour revenir au taux global. Le changement s’applique aux
          nouvelles commandes uniquement.
        </p>
      </form>
      <form className="admin-panel-form" onSubmit={submitFreeTickets}>
        <label>
          Billets gratuits
          <select
            value={freeChoice}
            disabled={isBusy}
            onChange={(formEvent) =>
              setFreeChoice(formEvent.target.value as FreeTicketsChoice)
            }
          >
            {Object.entries(freeTicketsLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-primary"
          disabled={
            isBusy ||
            freeChoice === freeTicketsChoice(event.freeTicketsEnabledOverride)
          }
        >
          {freeTickets.isPending ? 'Enregistrement…' : 'Appliquer'}
        </button>
        <p className="field-help">
          Autorise ou bloque les tarifs à 0 DT pour cet événement. La politique
          globale suit le réglage de la plateforme.
        </p>
      </form>
      {canCancel &&
        (isConfirmingCancel ? (
          <form className="admin-panel-form" onSubmit={submitCancel}>
            <label className="full-width">
              Motif de l’annulation
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                disabled={isBusy}
                placeholder="Ce motif est communiqué avec l’annulation."
              />
            </label>
            <button
              className="button button-outline admin-danger"
              disabled={isBusy}
            >
              {cancel.isPending ? 'Annulation…' : 'Confirmer l’annulation'}
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={isBusy}
              onClick={() => setIsConfirmingCancel(false)}
            >
              Garder l’événement
            </button>
          </form>
        ) : (
          <div className="admin-panel-form">
            <p className="field-help">
              {event.status === 'PUBLISHED'
                ? 'L’annulation retire l’événement du programme et déclenche le remboursement des billets vendus.'
                : 'Le brouillon ne pourra plus être publié.'}
            </p>
            <button
              className="button button-outline admin-danger"
              disabled={isBusy}
              onClick={() => setIsConfirmingCancel(true)}
            >
              Annuler l’événement
            </button>
          </div>
        ))}
      {(formError || error) && (
        <p className="form-error" role="alert">
          {formError || adminError(error)}
        </p>
      )}
    </div>
  )
}

export function AdminEventList() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (category) params.set('category', category)
  const events = useQuery({
    queryKey: ['admin', 'events', params.toString()],
    queryFn: () =>
      requestApi(
        `admin/events?${params.toString()}`,
        paginated(adminEventSchema),
      ),
    retry: false,
  })
  function submitSearch(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setPage(1)
    setSearch(
      String(new FormData(formEvent.currentTarget).get('search') || '').trim(),
    )
  }
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">Événements</p>
          <h1>Tout le programme, brouillons compris.</h1>
          <p>
            Vérifiez ce qui est publié, ajustez une commission ou annulez un
            événement problématique.
          </p>
        </div>
      </div>
      <div className="admin-filters">
        <form role="search" onSubmit={submitSearch}>
          <label className="input-with-icon">
            <span className="sr-only">Rechercher un événement</span>
            <MagnifyingGlassIcon />
            <input
              name="search"
              type="search"
              maxLength={100}
              defaultValue={search}
              placeholder="Titre de l’événement"
            />
          </label>
          <button className="button button-outline">Rechercher</button>
        </form>
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
            {Object.entries(eventStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Catégorie</span>
          <select
            value={category}
            onChange={(formEvent) => {
              setPage(1)
              setCategory(formEvent.target.value)
            }}
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <p className="form-success" role="status">
          <CheckCircleIcon />
          {notice}
        </p>
      )}
      <div className="workspace-section-title">
        <h2>Résultats</h2>
        <span>{events.data ? `${events.data.total} événements` : '—'}</span>
      </div>
      {events.isPending ? (
        <LoadingState />
      ) : events.isError ? (
        <DataState error={events.error} onRetry={() => void events.refetch()} />
      ) : events.data.data.length ? (
        <>
          <ul className="admin-list">
            {events.data.data.map((event) => {
              const isOpen = openId === event.id
              return (
                <li key={event.id}>
                  <div className="admin-row">
                    <span className="organizer-date">
                      <CalendarDaysIcon />
                      {formatEventDate(event.startDate)}
                    </span>
                    <div className="admin-row-main">
                      <span
                        className={`status-pill ${event.status === 'PUBLISHED' ? 'status-success' : event.status === 'CANCELLED' ? 'status-warning' : 'status-neutral'}`}
                      >
                        {eventStatusLabels[event.status] || event.status}
                      </span>
                      <h3>{event.title}</h3>
                      <p>
                        {categoryLabels[event.category] || event.category} ·{' '}
                        {event.city} · {formatEventTime(event.startDate)}
                      </p>
                      <p>
                        Par {event.organizer.name || 'organisateur inconnu'}
                        {event.organizer.email && ` (${event.organizer.email})`}
                      </p>
                      {event.cancellationReason && (
                        <p>Motif d’annulation : {event.cancellationReason}</p>
                      )}
                    </div>
                    <dl className="admin-row-figures">
                      <div>
                        <dt>Billets</dt>
                        <dd>
                          {event.soldTickets} / {event.totalCapacity}
                        </dd>
                      </div>
                      <div>
                        <dt>Ventes</dt>
                        <dd>{formatDinars(event.revenue, event.currency)}</dd>
                      </div>
                      <div>
                        <dt>Commission</dt>
                        <dd>
                          {event.commissionRateOverride === null
                            ? 'Taux global'
                            : formatRate(event.commissionRateOverride)}
                        </dd>
                      </div>
                      <div>
                        <dt>Gratuit</dt>
                        <dd>
                          {
                            freeTicketsLabels[
                              freeTicketsChoice(
                                event.freeTicketsEnabledOverride,
                              )
                            ]
                          }
                        </dd>
                      </div>
                    </dl>
                    <div className="admin-row-actions">
                      <button
                        className="button button-outline"
                        aria-expanded={isOpen}
                        onClick={() => {
                          setNotice('')
                          setOpenId(isOpen ? null : event.id)
                        }}
                      >
                        {isOpen ? 'Fermer' : 'Gérer'}
                      </button>
                      <Link
                        prefetch={false}
                        className="text-link"
                        href={`/admin/orders?eventId=${event.id}`}
                      >
                        Commandes
                      </Link>
                      {event.status === 'PUBLISHED' && (
                        <Link
                          prefetch={false}
                          className="text-link"
                          href={`/events/${event.id}`}
                        >
                          Page publique
                          <ArrowUpRightIcon />
                        </Link>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <EventPanel
                      key={`${event.id}-${event.status}-${event.commissionRateOverride}-${event.freeTicketsEnabledOverride}`}
                      event={event}
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
            totalPages={events.data.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <div className="empty-state">
          <CalendarDaysIcon />
          <h2>Aucun événement ne correspond.</h2>
          <p>Modifiez la recherche ou les filtres.</p>
        </div>
      )}
    </>
  )
}
