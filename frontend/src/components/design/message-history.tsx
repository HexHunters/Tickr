'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { EnvelopeIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

import { AccountNavigation } from '@/components/design/account-navigation'
import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { PageControls } from '@/components/entrance/page-controls'
import { notificationListSchema } from '@/lib/api/entrance-contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate, formatEventTime } from '@/lib/format'

const statusLabels = {
  PENDING: 'En attente',
  SENDING: 'En cours d’envoi',
  SENT: 'Envoyé',
  DELIVERED: 'Remis',
  FAILED: 'Échec d’envoi',
}
function Messages() {
  const [page, setPage] = useState(1)
  const result = useQuery({
    queryKey: ['my-messages', page],
    queryFn: () =>
      requestApi(
        `notifications/me?page=${page}&limit=12`,
        notificationListSchema,
      ),
    retry: false,
  })
  if (result.isPending)
    return <LoadingState label="Chargement de vos messages…" />
  if (result.isError)
    return (
      <DataState error={result.error} onRetry={() => void result.refetch()} />
    )
  if (!result.data.data.length)
    return (
      <div className="empty-state">
        <EnvelopeIcon />
        <h2>Rien à signaler pour le moment.</h2>
        <p>Les messages liés à votre compte apparaîtront ici.</p>
        <Link
          prefetch={false}
          href="/account/notifications"
          className="button button-outline"
        >
          Choisir mes notifications
          <ArrowRightIcon />
        </Link>
      </div>
    )
  return (
    <>
      <ul className="message-list">
        {result.data.data.map((message) => (
          <li key={message.id}>
            <span className="message-icon" aria-hidden="true">
              <EnvelopeIcon />
            </span>
            <div>
              <h2>{message.subject || 'Message Tickr'}</h2>
              <p>
                {message.channel === 'EMAIL'
                  ? 'E-mail'
                  : message.channel === 'SMS'
                    ? 'SMS'
                    : message.channel}{' '}
                ·{' '}
                <time dateTime={message.createdAt}>
                  {formatEventDate(message.createdAt)} à{' '}
                  {formatEventTime(message.createdAt)}, Tunis
                </time>
              </p>
            </div>
            <span
              className={`status-pill ${message.status === 'DELIVERED' ? 'status-success' : 'status-neutral'}`}
            >
              {statusLabels[message.status]}
            </span>
          </li>
        ))}
      </ul>
      <PageControls
        page={page}
        totalPages={Math.ceil(result.data.total / result.data.limit)}
        onPage={setPage}
      />
    </>
  )
}
export function MessageHistoryPage() {
  return (
    <main id="contenu" tabIndex={-1} className="container account-main">
      <div className="account-page-heading">
        <p className="section-caption">Votre espace</p>
        <h1>On vous tient au courant.</h1>
        <p>
          Retrouvez les messages liés à votre compte et leur statut d’envoi.
        </p>
      </div>
      <AccountNavigation active="messages" />
      <SessionGate>
        <Messages />
      </SessionGate>
    </main>
  )
}
