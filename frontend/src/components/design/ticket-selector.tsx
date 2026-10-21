'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  InformationCircleIcon,
  MinusIcon,
  PlusIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import { useSession } from '@/components/session-provider'
import { orderSchema } from '@/lib/api/contracts'
import { friendlyError, requestApi } from '@/lib/api/request'
import { formatMoney } from '@/lib/format'

import type { EventDetail, PublicConfig } from '@/lib/api/contracts'

export function TicketSelector({
  event,
  config,
}: {
  event: EventDetail
  config: PublicConfig | null
}) {
  const { user } = useSession()
  const router = useRouter()
  const [tierId, setTierId] = useState(
    event.ticketTypes.find(
      (tier) => tier.isActive && tier.isOnSale && !tier.isSoldOut,
    )?.id ??
      event.ticketTypes[0]?.id ??
      '',
  )
  const [quantity, setQuantity] = useState(1)
  const tier = event.ticketTypes.find((item) => item.id === tierId)
  const maximum = Math.min(6, tier?.availableQuantity ?? 0)
  const canReserve = Boolean(
    config?.availablePaymentMethods.length &&
    tier?.isOnSale &&
    !tier.isSoldOut &&
    maximum > 0 &&
    event.isOnSale,
  )
  const subtotal = Math.round((tier?.priceAmount ?? 0) * 1000) * quantity
  const fee = Math.round(subtotal * (config?.effectiveCommissionRate ?? 0))
  const reservation = useMutation({
    mutationFn: () => {
      if (!user || !tier) throw new Error('Session required')
      return requestApi('orders', orderSchema, {
        method: 'POST',
        body: JSON.stringify({
          eventId: event.id,
          items: [
            {
              ticketTypeId: tier.id,
              quantity,
              holders: Array.from({ length: quantity }, () => ({
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
              })),
            },
          ],
          holder: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
        }),
      })
    },
    onSuccess: (order) => router.push(`/checkout/${order.id}`),
    retry: false,
  })
  return (
    <section
      id="billetterie"
      className="ticket-selector"
      aria-labelledby="ticket-heading"
    >
      <div className="selector-heading">
        <TicketIcon />
        La billetterie
      </div>
      <h2 id="ticket-heading">Votre place est ici.</h2>
      {event.ticketTypes.length > 1 && (
        <label className="tier-select">
          Type de billet
          <select
            value={tierId}
            disabled={reservation.isPending}
            onChange={(e) => {
              setTierId(e.target.value)
              setQuantity(1)
            }}
          >
            {event.ticketTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isSoldOut
                  ? ' · Complet'
                  : !item.isOnSale
                    ? ' · Vente fermée'
                    : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="tier-row">
        <div>
          <h3>{tier?.name ?? 'Billets indisponibles'}</h3>
          <p>{tier?.description}</p>
          {tier && (
            <strong>
              <bdi>
                {formatMoney(
                  Math.round(tier.priceAmount * 1000),
                  tier.priceCurrency,
                )}
              </bdi>
            </strong>
          )}
        </div>
        {!tier || tier.isSoldOut || !tier.isOnSale ? (
          <span className="status-pill status-neutral">
            {tier?.isSoldOut ? 'Complet' : 'Vente fermée'}
          </span>
        ) : (
          <div className="quantity-control">
            <button
              aria-label="Retirer un billet"
              disabled={quantity <= 1 || reservation.isPending}
              onClick={() => setQuantity(quantity - 1)}
            >
              <MinusIcon />
            </button>
            <output aria-label="Nombre de billets" aria-live="polite">
              {quantity}
            </output>
            <button
              aria-label="Ajouter un billet"
              disabled={quantity >= maximum || reservation.isPending}
              onClick={() => setQuantity(quantity + 1)}
            >
              <PlusIcon />
            </button>
          </div>
        )}
      </div>
      <div className="selector-total">
        <span>
          {quantity} {quantity === 1 ? 'billet' : 'billets'} · Estimation avec
          frais
        </span>
        <strong>
          <bdi>{formatMoney(subtotal + fee, tier?.priceCurrency)}</bdi>
        </strong>
      </div>
      <p className="selector-help">
        {config
          ? `Frais de service estimés : ${formatMoney(fee, config.currency)}. Le total définitif sera confirmé dans le récapitulatif.`
          : 'La tarification est momentanément indisponible.'}
      </p>
      {reservation.isError && (
        <div className="form-error" role="alert">
          {friendlyError(reservation.error)} Vérifiez{' '}
          <Link href="/orders">mes commandes</Link> avant une nouvelle
          tentative.
        </div>
      )}
      {!user && canReserve ? (
        <Link
          className="button button-primary full-width"
          href={`/auth/login?returnTo=${encodeURIComponent(`/events/${event.id}`)}`}
        >
          Se connecter pour réserver
          <ArrowRightIcon />
        </Link>
      ) : (
        <button
          className="button button-primary full-width"
          disabled={!canReserve || reservation.isPending}
          onClick={() => reservation.mutate()}
        >
          {reservation.isPending
            ? 'Réservation en cours…'
            : canReserve
              ? 'Réserver mes billets'
              : event.isSoldOut
                ? 'Toutes les places sont parties'
                : 'Réservation indisponible'}
          <ArrowRightIcon />
        </button>
      )}
      <p className="selector-note">
        <InformationCircleIcon />
        {canReserve
          ? 'Une réservation ne confirme pas le paiement.'
          : 'Aucun paiement disponible pour le moment.'}
      </p>
    </section>
  )
}
