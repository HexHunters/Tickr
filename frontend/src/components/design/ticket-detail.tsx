'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { z } from 'zod'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { ReservationDeadline } from '@/components/design/order-experience'
import { TicketStatus } from '@/components/design/ticket-wallet'
import {
  eventDetailSchema,
  orderSchema,
  ticketDetailSchema,
} from '@/lib/api/contracts'
import { friendlyError, requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime } from '@/lib/format'
import { canDisplayEntryCode } from '@/lib/ticket-access'

function EntryCode({ value }: { value: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    if (canvas.current)
      void QRCode.toCanvas(canvas.current, value, {
        width: 280,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#233A42', light: '#FFFFFF' },
      }).catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [value])
  return error ? (
    <p role="alert">
      Le code ne peut pas être affiché. Rechargez le billet avant votre arrivée.
    </p>
  ) : (
    <canvas
      ref={canvas}
      className="entry-qr"
      role="img"
      aria-label="Code QR d’entrée personnel"
    />
  )
}
function TicketContent({ id }: { id: string }) {
  const ticket = useQuery({
    queryKey: ['ticket', id],
    queryFn: () =>
      requestApi(`tickets/${encodeURIComponent(id)}`, ticketDetailSchema),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const event = useQuery({
    queryKey: ['event', ticket.data?.eventId],
    queryFn: () =>
      requestApi(`events/${ticket.data?.eventId}`, eventDetailSchema),
    enabled: Boolean(ticket.data),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const order = useQuery({
    queryKey: ['order', ticket.data?.orderId],
    queryFn: () => requestApi(`orders/${ticket.data?.orderId}`, orderSchema),
    enabled: Boolean(ticket.data?.orderId),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const [pdfError, setPdfError] = useState('')
  const [isPdfPending, setIsPdfPending] = useState(false)
  if (ticket.isPending)
    return <LoadingState label="Ouverture de votre billet…" />
  if (ticket.isError)
    return (
      <DataState error={ticket.error} onRetry={() => void ticket.refetch()} />
    )
  const data = ticket.data
  const isEntryAvailable =
    !order.isError &&
    !order.isFetching &&
    canDisplayEntryCode(data.status, order.data?.status)
  async function downloadPdf() {
    setPdfError('')
    setIsPdfPending(true)
    try {
      const result = await requestApi(
        `tickets/${id}/pdf`,
        z.object({ url: z.url() }),
      )
      const url = new URL(result.url)
      if (!['https:', 'http:'].includes(url.protocol))
        throw new Error('Invalid PDF URL')
      window.open(url.href, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setPdfError(friendlyError(error))
    } finally {
      setIsPdfPending(false)
    }
  }
  return (
    <div className="ticket-detail-layout">
      <div className="ticket-pass standalone-pass">
        <div className="pass-heading">
          <span>tickr / En scène</span>
          <TicketIcon />
        </div>
        <div className="pass-event">
          <TicketStatus status={data.status} />
          <h1>{event.data?.title ?? 'Votre billet'}</h1>
          {event.data ? (
            <>
              <p>{formatEventDate(event.data.startDate, true)}</p>
              <p>
                {formatEventTime(event.data.startDate)} ·{' '}
                {event.data.location.city} · Heure de Tunis
              </p>
              <p>{event.data.location.address}</p>
            </>
          ) : (
            <p>Référence événement : {data.eventId}</p>
          )}
          <div className="pass-holder">
            <span>Titulaire du billet</span>
            <strong>{data.holderName}</strong>
            <span>{data.holderEmail}</span>
          </div>
        </div>
        <div className="pass-stub">
          {isEntryAvailable ? (
            <div className="qr-tile">
              <EntryCode value={data.qrCode} />
            </div>
          ) : (
            <div className="pass-code-placeholder">
              <TicketIcon />
              <strong>
                {data.status === 'CHECKED_IN'
                  ? 'Ce billet a déjà été utilisé'
                  : data.status === 'RESERVED'
                    ? 'Réservation non payée'
                    : 'Code d’entrée indisponible'}
              </strong>
              <span>
                {data.status === 'CHECKED_IN' && data.checkedInAt
                  ? `${formatEventDate(data.checkedInAt)} à ${formatEventTime(data.checkedInAt)}`
                  : 'Un paiement confirmé et un billet valide sont nécessaires.'}
              </span>
            </div>
          )}
          <p>Référence du billet</p>
          <bdi className="pass-reference">{data.id}</bdi>
        </div>
      </div>
      <aside className="ticket-detail-aside">
        <h2>
          {isEntryAvailable
            ? 'Tout est prêt.'
            : 'Votre billet, étape par étape.'}
        </h2>
        <p>
          {isEntryAvailable
            ? 'Présentez ce code à l’entrée. Chaque billet est personnel et ne permet qu’un seul passage.'
            : 'Le statut affiché vient de votre espace. Le code d’entrée apparaît uniquement pour un billet confirmé lié à une commande payée.'}
        </p>
        {order.isPending && data.orderId && (
          <p role="status">Vérification du paiement…</p>
        )}
        {order.isError && (
          <DataState error={order.error} onRetry={() => void order.refetch()} />
        )}
        {data.status === 'RESERVED' && data.reservedUntil && (
          <ReservationDeadline expiresAt={data.reservedUntil} />
        )}
        {isEntryAvailable && data.pdfUrl && (
          <button
            className="button button-primary"
            onClick={() => void downloadPdf()}
            disabled={isPdfPending}
          >
            <ArrowDownTrayIcon />
            {isPdfPending ? 'Préparation…' : 'Télécharger le PDF'}
          </button>
        )}
        {isEntryAvailable && !data.pdfUrl && (
          <p className="field-help">
            Le PDF n’est pas encore disponible. Vous pouvez présenter le code
            affiché sur cette page.
          </p>
        )}
        {pdfError && (
          <p className="form-error" role="alert">
            {pdfError}
          </p>
        )}
        {data.orderId && (
          <Link className="text-link" href={`/orders/${data.orderId}`}>
            Voir ma commande
            <ArrowRightIcon />
          </Link>
        )}
        <div className="ticket-privacy">
          <InformationCircleIcon />
          <p>
            Gardez votre code pour vous. Évitez de le publier ou de le partager.
          </p>
        </div>
      </aside>
    </div>
  )
}
export function TicketDetailPageContent({ id }: { id: string }) {
  return (
    <main id="contenu" tabIndex={-1} className="container account-main">
      <Link className="back-link" href="/tickets">
        <ArrowLeftIcon />
        Mes billets
      </Link>
      <SessionGate>
        <TicketContent id={id} />
      </SessionGate>
    </main>
  )
}
