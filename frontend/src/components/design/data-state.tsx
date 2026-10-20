'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  LockClosedIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

import { useSession } from '@/components/session-provider'
import { ApiError, friendlyError } from '@/lib/api/request'

export function DataState({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  const pathname = usePathname()
  const isAuth = error instanceof ApiError && error.status === 401
  const isUnavailableToUser =
    error instanceof ApiError && [403, 404].includes(error.status)
  return (
    <div className="empty-state data-state" role="alert">
      <TicketIcon />
      <h2>
        {isAuth
          ? 'On se reconnecte ?'
          : isUnavailableToUser
            ? 'Cet espace est personnel.'
            : 'Il manque un morceau.'}
      </h2>
      <p>{friendlyError(error)}</p>
      {isAuth ? (
        <Link
          className="button button-primary"
          href={`/auth/login?returnTo=${encodeURIComponent(pathname)}`}
        >
          Se connecter
          <ArrowRightIcon />
        </Link>
      ) : isUnavailableToUser ? (
        <Link className="button button-primary" href="/tickets">
          Revenir à mes billets
          <ArrowRightIcon />
        </Link>
      ) : (
        <button
          className="button button-primary"
          onClick={onRetry ?? (() => window.location.reload())}
        >
          <ArrowPathIcon />
          Réessayer
        </button>
      )}
    </div>
  )
}

export function LoadingState({
  label = 'Chargement des informations…',
}: {
  label?: string
}) {
  return (
    <div className="data-loading" role="status">
      <span className="loading-mark" aria-hidden="true" />
      <p>{label}</p>
      <div className="loading-line" />
      <div className="loading-line" />
    </div>
  )
}

export function SessionGate({
  children,
  returnTo,
}: {
  children: React.ReactNode
  returnTo?: string
}) {
  const { user, isPending, isError } = useSession()
  const pathname = usePathname()
  if (isPending) return <LoadingState label="Ouverture de votre espace…" />
  if (isError)
    return (
      <DataState
        error={new ApiError(503, 'UNAVAILABLE', '')}
        onRetry={() => window.location.reload()}
      />
    )
  if (!user)
    return (
      <div className="empty-state">
        <LockClosedIcon />
        <h2>Votre prochaine sortie est à vous.</h2>
        <p>
          Connectez-vous pour retrouver vos réservations
          <br />
          et vos billets, au même endroit.
        </p>
        <Link
          className="button button-primary"
          href={`/auth/login?returnTo=${encodeURIComponent(returnTo ?? pathname)}`}
        >
          Se connecter
          <ArrowRightIcon />
        </Link>
        <Link className="text-link" href="/auth/register">
          Créer mon compte
        </Link>
      </div>
    )
  return children
}
