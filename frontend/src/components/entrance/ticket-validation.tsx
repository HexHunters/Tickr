'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  QrCodeIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { eventDetailSchema } from '@/lib/api/contracts'
import {
  checkInSuccessSchema,
  entranceStatsSchema,
} from '@/lib/api/entrance-contracts'
import { requestApi } from '@/lib/api/request'
import { checkInError } from '@/lib/entrance'
import { formatEventDate, formatEventTime } from '@/lib/format'

import type { FormEvent } from 'react'

function ValidationForm({ id, title }: { id: string; title: string }) {
  const codeInput = useRef<HTMLTextAreaElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const device = useRef('')
  const validation = useMutation({
    mutationFn: (payload: { qrCode: string; locationGate: string }) => {
      if (!device.current) device.current = `web-${crypto.randomUUID()}`
      return requestApi('tickets/check-in', checkInSuccessSchema, {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          eventId: id,
          deviceId: device.current,
        }),
      })
    },
    retry: false,
    gcTime: 0,
  })
  useEffect(() => {
    if (validation.status === 'success' || validation.status === 'error') {
      resultHeading.current?.focus()
    }
  }, [validation.status])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (validation.isPending) return
    const data = new FormData(event.currentTarget)
    const qrCode = String(data.get('qrCode') || '').trim()
    const locationGate = String(data.get('locationGate') || '').trim()
    if (qrCode && locationGate) validation.mutate({ qrCode, locationGate })
  }
  function nextTicket() {
    validation.reset()
    if (codeInput.current) {
      codeInput.current.value = ''
      // A successful result disables the fieldset until React commits the reset.
      requestAnimationFrame(() => codeInput.current?.focus())
    }
  }
  return (
    <div className="validation-layout">
      <form className="validation-form" onSubmit={submit}>
        <fieldset disabled={validation.isPending || validation.isSuccess}>
          <legend>Valider un billet</legend>
          <label>
            Point d’entrée
            <input
              name="locationGate"
              required
              maxLength={50}
              placeholder="Ex. Entrée principale"
              autoComplete="off"
            />
          </label>
          <label>
            Code du billet
            <textarea
              ref={codeInput}
              name="qrCode"
              required
              rows={3}
              maxLength={500}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Collez le contenu du QR ou utilisez votre lecteur externe."
              onChange={() => {
                if (validation.isError) validation.reset()
              }}
            />
          </label>
          <p className="field-help">
            Un billet à la fois, pour « {title} ». La validation enregistre son
            entrée.
          </p>
          <button
            className="button button-primary"
            disabled={validation.isPending || validation.isSuccess}
          >
            {validation.isPending ? 'Vérification…' : 'Valider l’entrée'}
            <QrCodeIcon />
          </button>
        </fieldset>
      </form>
      <section
        className={`validation-result ${validation.isSuccess ? 'entry-accepted' : validation.isError ? 'entry-refused' : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {validation.isSuccess ? (
          <>
            <CheckCircleIcon />
            <h2 ref={resultHeading} tabIndex={-1}>
              Entrée enregistrée.
            </h2>
            <strong>{validation.data.holderName}</strong>
            <p>{validation.data.ticketTypeName}</p>
            <p>
              {formatEventDate(validation.data.checkedInAt)} à{' '}
              {formatEventTime(validation.data.checkedInAt)} · Tunis
            </p>
            <button className="button button-primary" onClick={nextTicket}>
              Billet suivant
            </button>
          </>
        ) : validation.isError ? (
          <>
            <XCircleIcon />
            <h2 ref={resultHeading} tabIndex={-1}>
              Entrée non confirmée.
            </h2>
            <p>{checkInError(validation.error)}</p>
            <button className="button button-outline" onClick={nextTicket}>
              Présenter un autre billet
            </button>
          </>
        ) : (
          <>
            <QrCodeIcon />
            <h2>
              {validation.isPending
                ? 'On vérifie le billet…'
                : 'Prêt pour le prochain.'}
            </h2>
            <p>
              {validation.isPending
                ? 'Attendez la confirmation avant de laisser entrer la personne.'
                : 'La confirmation apparaîtra ici après validation du billet.'}
            </p>
          </>
        )}
      </section>
    </div>
  )
}
function EventValidation({ id }: { id: string }) {
  // The statistics endpoint checks the current operator's actual event access.
  const access = useQuery({
    queryKey: ['check-in-stats', id],
    queryFn: () =>
      requestApi(
        `tickets/event/${encodeURIComponent(id)}/stats`,
        entranceStatsSchema,
      ),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const event = useQuery({
    queryKey: ['event', id],
    queryFn: () =>
      requestApi(`events/${encodeURIComponent(id)}`, eventDetailSchema),
    enabled: access.isSuccess,
    retry: false,
  })
  if (access.isPending || (access.isSuccess && event.isPending))
    return <LoadingState label="Ouverture du contrôle…" />
  if (access.isError)
    return (
      <DataState error={access.error} onRetry={() => void access.refetch()} />
    )
  if (event.isError)
    return (
      <DataState error={event.error} onRetry={() => void event.refetch()} />
    )
  if (!event.data) return null
  return (
    <>
      <div className="validation-event">
        <span className="status-pill status-success">Accès au contrôle</span>
        <h1>{event.data.title}</h1>
        <p>
          {formatEventDate(event.data.startDate, true)} ·{' '}
          {formatEventTime(event.data.startDate)}, Tunis
        </p>
      </div>
      <ValidationForm id={id} title={event.data.title} />
    </>
  )
}
export function TicketValidationPage({ id }: { id: string }) {
  return (
    <main id="contenu" tabIndex={-1} className="container entrance-main">
      <Link prefetch={false} className="back-link" href="/check-in">
        <ArrowLeftIcon />
        Mes événements à l’entrée
      </Link>
      <SessionGate>
        <EventValidation id={id} />
      </SessionGate>
    </main>
  )
}
