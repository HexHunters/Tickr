'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

import { DataState, LoadingState } from '@/components/design/data-state'
import { OrganizerEventForm } from '@/components/organizer/event-form'
import { managedEventSchema } from '@/lib/api/contracts'
import { friendlyError, requestApi } from '@/lib/api/request'
import { eventStatusLabels, tunisInputToIso } from '@/lib/organizer'
import { formatMoney } from '@/lib/format'

import type { FormEvent } from 'react'
import type { ManagedEvent } from '@/lib/api/contracts'

function TicketTypeForm({ event }: { event: ManagedEvent }) {
  const [validationError, setValidationError] = useState('')
  const queryClient = useQueryClient()
  const add = useMutation({
    mutationFn: (payload: {
      name: string
      price: number
      quantity: number
      currency: string
      salesStartDate: string
      salesEndDate: string
    }) =>
      requestApi(
        `events/${event.id}/ticket-types`,
        z.object({ ticketTypeId: z.string() }),
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['managed-event', event.id],
      })
      await queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
    },
  })
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = formEvent.currentTarget
    const fields = new FormData(form)
    const value = (key: string) => String(fields.get(key) || '').trim()
    setValidationError('')
    try {
      const salesStartDate = tunisInputToIso(value('salesStartDate'))
      const salesEndDate = tunisInputToIso(value('salesEndDate'))
      if (Date.parse(salesEndDate) <= Date.parse(salesStartDate))
        throw new Error('La fin des ventes doit être après leur ouverture.')
      if (Date.parse(salesEndDate) > Date.parse(event.startDate))
        throw new Error(
          'Les ventes doivent se terminer avant le début de l’événement.',
        )
      add.mutate(
        {
          name: value('name'),
          price: Number(value('price')),
          quantity: Number(value('quantity')),
          currency: 'TND',
          salesStartDate,
          salesEndDate,
        },
        { onSuccess: () => form.reset() },
      )
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : 'Vérifiez la période de vente.',
      )
    }
  }
  return (
    <details className="organizer-add-tier">
      <summary>
        <PlusIcon />
        Ajouter un tarif
      </summary>
      <form className="organizer-form" onSubmit={submit}>
        <fieldset disabled={add.isPending}>
          <legend>Nouveau tarif</legend>
          <label>
            Nom du tarif
            <input
              name="name"
              required
              maxLength={100}
              placeholder="Entrée standard"
            />
          </label>
          <div className="form-grid">
            <label>
              Prix facial (DT)
              <input
                name="price"
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                required
              />
            </label>
            <label>
              Nombre de places
              <input
                name="quantity"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                required
              />
            </label>
          </div>
          <p className="field-help">
            Prix hors frais de service. Le montant final est présenté à
            l’acheteur lors de sa réservation.
          </p>
          <div className="form-grid">
            <label>
              Ouverture des ventes
              <input name="salesStartDate" type="datetime-local" required />
            </label>
            <label>
              Fin des ventes
              <input name="salesEndDate" type="datetime-local" required />
            </label>
          </div>
          <p className="field-help">
            Horaires de Tunis. Les ventes doivent se terminer avant l’événement.
          </p>
        </fieldset>
        {(validationError || add.isError) && (
          <p className="form-error" role="alert">
            {validationError || friendlyError(add.error)}
          </p>
        )}
        {add.isSuccess && (
          <p className="form-success" role="status">
            <CheckCircleIcon />
            Le tarif est ajouté.
          </p>
        )}
        <button className="button button-primary" disabled={add.isPending}>
          {add.isPending ? 'Ajout…' : 'Ajouter le tarif'}
          <PlusIcon />
        </button>
      </form>
    </details>
  )
}

export function OrganizerEventManager({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const [isConfirming, setIsConfirming] = useState(false)
  const event = useQuery({
    queryKey: ['managed-event', id],
    queryFn: () =>
      requestApi(`events/${encodeURIComponent(id)}/manage`, managedEventSchema),
    retry: false,
  })
  const publish = useMutation({
    mutationFn: () =>
      requestApi(
        `events/${encodeURIComponent(id)}/publish`,
        z.object({ message: z.string() }),
        { method: 'POST' },
      ),
    onSuccess: async () => {
      setIsConfirming(false)
      await queryClient.invalidateQueries({ queryKey: ['managed-event', id] })
      await queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
    },
  })
  if (event.isPending) return <LoadingState label="Ouverture de l’événement…" />
  if (event.isError)
    return (
      <DataState error={event.error} onRetry={() => void event.refetch()} />
    )
  const detail = event.data
  const isEditable = detail.status === 'DRAFT'
  return (
    <>
      <Link className="back-link" href="/organizer/events">
        <ArrowLeftIcon />
        Mes événements
      </Link>
      <div className="workspace-heading">
        <div>
          <span
            className={`status-pill ${detail.status === 'PUBLISHED' ? 'status-success' : 'status-neutral'}`}
          >
            {eventStatusLabels[detail.status] || detail.status}
          </span>
          <h1>{detail.title}</h1>
          <p>{detail.location.city} · Heure de Tunis</p>
        </div>
        {detail.status === 'PUBLISHED' && (
          <Link
            className="button button-outline"
            prefetch={false}
            href={`/events/${id}`}
          >
            Voir la page publique
            <ArrowUpRightIcon />
          </Link>
        )}
      </div>
      <dl className="event-management-stats">
        <div>
          <dt>Capacité</dt>
          <dd>{detail.totalCapacity}</dd>
        </div>
        <div>
          <dt>Billets vendus</dt>
          <dd>{detail.soldTickets}</dd>
        </div>
        <div>
          <dt>Places restantes</dt>
          <dd>{detail.availableCapacity}</dd>
        </div>
      </dl>
      {detail.status === 'DRAFT' && (
        <section className="publish-panel" aria-labelledby="publish-title">
          <div>
            <h2 id="publish-title">Prêt à entrer en scène ?</h2>
            <p>
              {detail.ticketTypes.length
                ? 'Vérifiez les informations et les tarifs avant de publier.'
                : 'Ajoutez au moins un tarif avant la publication.'}
            </p>
          </div>
          {!isConfirming ? (
            <button
              className="button button-primary"
              disabled={!detail.ticketTypes.length || detail.hasStarted}
              onClick={() => setIsConfirming(true)}
            >
              Publier l’événement
            </button>
          ) : (
            <div
              className="publish-confirm"
              role="group"
              aria-label="Confirmer la publication"
            >
              <p>Votre événement sera visible dans le programme public.</p>
              <button
                className="button button-primary"
                disabled={publish.isPending}
                onClick={() => publish.mutate()}
              >
                {publish.isPending
                  ? 'Publication…'
                  : 'Confirmer la publication'}
              </button>
              <button
                className="button button-outline"
                disabled={publish.isPending}
                onClick={() => setIsConfirming(false)}
              >
                Revenir
              </button>
            </div>
          )}
          {publish.isError && (
            <p className="form-error" role="alert">
              {friendlyError(publish.error)}
            </p>
          )}
        </section>
      )}
      {publish.isSuccess && (
        <p className="form-success" role="status">
          <CheckCircleIcon />
          Votre événement est publié.
        </p>
      )}
      <section className="workspace-section" aria-labelledby="tiers-title">
        <div className="workspace-section-title">
          <h2 id="tiers-title">Les tarifs</h2>
          <span>{detail.ticketTypes.length} tarif(s)</span>
        </div>
        {detail.ticketTypes.length ? (
          <div className="tier-management-list">
            {detail.ticketTypes.map((tier) => (
              <div key={tier.id}>
                <div>
                  <h3>{tier.name}</h3>
                  <p>
                    {tier.availableQuantity} place(s) restante(s) ·{' '}
                    {tier.isActive ? 'Actif' : 'Inactif'}
                  </p>
                </div>
                <strong>
                  <bdi>
                    {formatMoney(
                      Math.round(tier.priceAmount * 1000),
                      tier.priceCurrency,
                    )}
                  </bdi>
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Aucun tarif pour le moment.</p>
        )}
        {isEditable && <TicketTypeForm event={detail} />}
      </section>
      <section className="workspace-section" aria-labelledby="info-title">
        <div className="workspace-section-title">
          <h2 id="info-title">Les informations</h2>
        </div>
        {isEditable ? (
          <OrganizerEventForm event={detail} />
        ) : (
          <p>
            Les informations de cet événement ne peuvent plus être modifiées.
          </p>
        )}
      </section>
    </>
  )
}
