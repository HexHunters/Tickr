'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

import { AdminPagination } from '@/components/admin/workspace'
import { DataState, LoadingState } from '@/components/design/data-state'
import { useSession } from '@/components/session-provider'
import { adminUserSchema } from '@/lib/api/admin-contracts'
import { paginated } from '@/lib/api/contracts'
import { requestApi } from '@/lib/api/request'
import { adminError, organizerObligations, roleLabels } from '@/lib/admin'
import { formatEventDate } from '@/lib/format'

import type { FormEvent } from 'react'
import type { AdminUser, UserRole } from '@/lib/api/admin-contracts'

const roles = Object.keys(roleLabels) as UserRole[]

type Notice = { text: string; eventsOf?: string }

/** Admins and organizers can own events. */
function canOwnEvents(user: AdminUser) {
  return user.role !== 'PARTICIPANT'
}

function fullName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function UserPanel({
  user,
  onDone,
}: {
  user: AdminUser
  onDone: (notice: Notice) => void
}) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState<UserRole>(user.role)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] })
  const changeRole = useMutation({
    mutationFn: (next: UserRole) =>
      requestApi(`admin/users/${user.id}/role`, adminUserSchema, {
        method: 'PATCH',
        body: JSON.stringify({ role: next }),
      }),
    onSuccess: async (updated) => {
      await refresh()
      onDone({
        text: `${fullName(updated)} est maintenant ${roleLabels[updated.role].toLowerCase()}.`,
      })
    },
  })
  const setStatus = useMutation({
    mutationFn: (isActive: boolean) =>
      requestApi(`admin/users/${user.id}/status`, adminUserSchema, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: async (updated) => {
      await refresh()
      onDone(
        updated.isActive
          ? { text: `Le compte de ${fullName(updated)} est réactivé.` }
          : canOwnEvents(updated)
            ? {
                text: `Le compte de ${fullName(updated)} est suspendu. Ses événements restent en ligne : décidez de leur suite.`,
                eventsOf: updated.id,
              }
            : { text: `Le compte de ${fullName(updated)} est suspendu.` },
      )
    },
  })
  const isBusy = changeRole.isPending || setStatus.isPending
  const error = changeRole.error || setStatus.error
  function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus.reset()
    if (role !== user.role) changeRole.mutate(role)
  }
  return (
    <div className="admin-panel">
      <form className="admin-panel-form" onSubmit={submitRole}>
        <label>
          Rôle
          <select
            value={role}
            disabled={isBusy}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-primary"
          disabled={isBusy || role === user.role}
        >
          {changeRole.isPending ? 'Enregistrement…' : 'Changer le rôle'}
        </button>
      </form>
      <div className="admin-panel-form">
        <p className="field-help">
          {user.isActive
            ? 'Un compte suspendu ne peut plus se connecter ni prolonger sa session. Ses billets et commandes sont conservés.'
            : 'La réactivation permet à nouveau la connexion.'}
        </p>
        <button
          className={`button ${user.isActive ? 'button-outline admin-danger' : 'button-primary'}`}
          disabled={isBusy}
          onClick={() => {
            changeRole.reset()
            setStatus.mutate(!user.isActive)
          }}
        >
          {setStatus.isPending
            ? 'Enregistrement…'
            : user.isActive
              ? 'Suspendre le compte'
              : 'Réactiver le compte'}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {adminError(error)}{' '}
          {organizerObligations(error) && (
            <Link
              className="text-link"
              href={`/admin/events?organizerId=${user.id}`}
            >
              Voir ses événements
            </Link>
          )}
        </p>
      )}
    </div>
  )
}

export function AdminUserList() {
  const { user: currentUser } = useSession()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  if (role) params.set('role', role)
  if (status) params.set('status', status)
  const users = useQuery({
    queryKey: ['admin', 'users', params.toString()],
    queryFn: () =>
      requestApi(
        `admin/users?${params.toString()}`,
        paginated(adminUserSchema),
      ),
    retry: false,
  })
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(
      String(new FormData(event.currentTarget).get('search') || '').trim(),
    )
  }
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">Comptes</p>
          <h1>Les personnes derrière Tickr.</h1>
          <p>
            Retrouvez un compte, attribuez le rôle organisateur ou suspendez un
            accès.
          </p>
        </div>
      </div>
      <div className="admin-filters">
        <form role="search" onSubmit={submitSearch}>
          <label className="input-with-icon">
            <span className="sr-only">Rechercher un compte</span>
            <MagnifyingGlassIcon />
            <input
              name="search"
              type="search"
              maxLength={100}
              defaultValue={search}
              placeholder="Nom ou adresse e-mail"
            />
          </label>
          <button className="button button-outline">Rechercher</button>
        </form>
        <label>
          <span className="sr-only">Rôle</span>
          <select
            value={role}
            onChange={(event) => {
              setPage(1)
              setRole(event.target.value)
            }}
          >
            <option value="">Tous les rôles</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Statut</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Suspendus</option>
          </select>
        </label>
      </div>
      {notice && (
        <p className="form-success" role="status">
          <CheckCircleIcon />
          <span>
            {notice.text}{' '}
            {notice.eventsOf && (
              <Link
                className="text-link"
                href={`/admin/events?organizerId=${notice.eventsOf}`}
              >
                Voir ses événements
              </Link>
            )}
          </span>
        </p>
      )}
      <div className="workspace-section-title">
        <h2>Résultats</h2>
        <span>{users.data ? `${users.data.total} comptes` : '—'}</span>
      </div>
      {users.isPending ? (
        <LoadingState />
      ) : users.isError ? (
        <DataState error={users.error} onRetry={() => void users.refetch()} />
      ) : users.data.data.length ? (
        <>
          <ul className="admin-list">
            {users.data.data.map((user) => {
              const isSelf = user.id === currentUser?.id
              const isOpen = openId === user.id
              return (
                <li key={user.id}>
                  <div className="admin-row">
                    <span className="team-avatar" aria-hidden="true">
                      {fullName(user).slice(0, 1)}
                    </span>
                    <div className="admin-row-main">
                      <h3>
                        {fullName(user)}
                        {isSelf && <span className="muted"> · vous</span>}
                      </h3>
                      <p>{user.email}</p>
                      <p>
                        Inscrit le {formatEventDate(user.createdAt)}
                        {user.lastLoginAt
                          ? ` · dernière connexion le ${formatEventDate(user.lastLoginAt)}`
                          : ' · jamais connecté'}
                      </p>
                    </div>
                    <div className="admin-row-tags">
                      <span
                        className={`status-pill ${user.role === 'PARTICIPANT' ? 'status-neutral' : 'status-success'}`}
                      >
                        {roleLabels[user.role]}
                      </span>
                      {!user.isActive && (
                        <span className="status-pill status-warning">
                          Suspendu
                        </span>
                      )}
                      {canOwnEvents(user) && (
                        <Link
                          prefetch={false}
                          className="text-link"
                          href={`/admin/events?organizerId=${user.id}`}
                        >
                          Ses événements
                        </Link>
                      )}
                    </div>
                    <button
                      className="button button-outline"
                      disabled={isSelf}
                      aria-expanded={isOpen}
                      title={
                        isSelf
                          ? 'Votre propre compte se gère depuis « Mon compte ».'
                          : undefined
                      }
                      onClick={() => {
                        setNotice(null)
                        setOpenId(isOpen ? null : user.id)
                      }}
                    >
                      {isOpen ? 'Fermer' : 'Gérer'}
                    </button>
                  </div>
                  {isOpen && (
                    <UserPanel
                      key={`${user.id}-${user.role}-${user.isActive}`}
                      user={user}
                      onDone={(next) => {
                        setNotice(next)
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
            totalPages={users.data.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <div className="empty-state">
          <UsersIcon />
          <h2>Aucun compte ne correspond.</h2>
          <p>Modifiez la recherche ou les filtres.</p>
        </div>
      )}
    </>
  )
}
