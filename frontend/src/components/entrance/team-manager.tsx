'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

import { DataState, LoadingState } from '@/components/design/data-state'
import { PageControls } from '@/components/entrance/page-controls'
import { managedEventSchema, paginated } from '@/lib/api/contracts'
import { staffAssignmentSchema } from '@/lib/api/entrance-contracts'
import { requestApi } from '@/lib/api/request'
import { teamError } from '@/lib/entrance'
import { formatEventDate } from '@/lib/format'

import type { FormEvent } from 'react'
import type { StaffAssignment } from '@/lib/api/entrance-contracts'

function memberName(member: StaffAssignment) {
  return (
    [member.firstName, member.lastName].filter(Boolean).join(' ') ||
    'Compte indisponible'
  )
}

export function TeamManager({ id }: { id: string }) {
  const [page, setPage] = useState(1)
  const [removal, setRemoval] = useState<StaffAssignment | null>(null)
  const [notice, setNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const event = useQuery({
    queryKey: ['managed-event', id],
    queryFn: () =>
      requestApi(`events/${encodeURIComponent(id)}/manage`, managedEventSchema),
    retry: false,
  })
  const staff = useQuery({
    queryKey: ['event-staff', id, page],
    queryFn: () =>
      requestApi(
        `events/${encodeURIComponent(id)}/check-in-staff?page=${page}&limit=12`,
        paginated(staffAssignmentSchema),
      ),
    enabled: event.isSuccess,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const assign = useMutation({
    mutationFn: (email: string) =>
      requestApi(`events/${id}/check-in-staff`, staffAssignmentSchema, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: async (member) => {
      setNotice(`L’accès de ${memberName(member)} est ajouté.`)
      if (inputRef.current) inputRef.current.value = ''
      await queryClient.invalidateQueries({ queryKey: ['event-staff', id] })
      await queryClient.invalidateQueries({ queryKey: ['check-in-access'] })
    },
  })
  const revoke = useMutation({
    mutationFn: (assignmentId: string) =>
      requestApi(`events/${id}/check-in-staff/${assignmentId}`, z.void(), {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      setNotice('L’accès est retiré pour cet événement.')
      setRemoval(null)
      // Returning to page one also handles revoking the last member on a page.
      setPage(1)
      await queryClient.invalidateQueries({ queryKey: ['event-staff', id] })
      await queryClient.invalidateQueries({ queryKey: ['check-in-access'] })
      inputRef.current?.focus()
    },
  })
  function addMember(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setNotice('')
    revoke.reset()
    const email = String(
      new FormData(formEvent.currentTarget).get('email') || '',
    ).trim()
    if (email) assign.mutate(email)
  }
  const isBusy = assign.isPending || revoke.isPending
  return (
    <>
      <Link
        prefetch={false}
        href={`/organizer/events/${id}`}
        className="back-link"
      >
        <ArrowLeftIcon />
        Gérer l’événement
      </Link>
      <div className="workspace-heading">
        <div>
          <p className="section-caption">
            {event.data?.title || 'Votre événement'}
          </p>
          <h1>L’équipe d’entrée.</h1>
          <p>
            Accordez un accès au contrôle de cet événement à des personnes de
            confiance.
          </p>
        </div>
      </div>
      {event.isError ? (
        <DataState error={event.error} onRetry={() => void event.refetch()} />
      ) : event.isPending ? (
        <LoadingState />
      ) : (
        <>
          <form className="team-invite" onSubmit={addMember}>
            <label>
              Adresse e-mail du compte
              <input
                ref={inputRef}
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                placeholder="prenom@exemple.tn"
                disabled={
                  isBusy ||
                  ['CANCELLED', 'COMPLETED'].includes(event.data.status)
                }
              />
            </label>
            <button
              className="button button-primary"
              disabled={
                isBusy || ['CANCELLED', 'COMPLETED'].includes(event.data.status)
              }
            >
              <PlusIcon />
              {assign.isPending ? 'Ajout…' : 'Ajouter à l’équipe'}
            </button>
            <p className="field-help">
              Le compte doit être actif et vérifié. Cet accès permet de valider
              les billets de cet événement, sans encaisser de paiement.
            </p>
          </form>
          {(assign.isError || revoke.isError) && (
            <p className="form-error" role="alert">
              {teamError(assign.error || revoke.error)}
            </p>
          )}
          {notice && (
            <p className="form-success team-notice" role="status">
              <CheckCircleIcon />
              {notice}
            </p>
          )}
          <section className="workspace-section">
            <div className="workspace-section-title">
              <h2>Personnes autorisées</h2>
              <span>{staff.data?.total ?? '—'}</span>
            </div>
            {staff.isPending ? (
              <LoadingState />
            ) : staff.isError ? (
              <DataState
                error={staff.error}
                onRetry={() => void staff.refetch()}
              />
            ) : staff.data.data.length ? (
              <>
                <ul className="team-list">
                  {staff.data.data.map((member) => (
                    <li key={member.id}>
                      <div className="team-member">
                        <span className="team-avatar" aria-hidden="true">
                          {memberName(member).slice(0, 1)}
                        </span>
                        <div>
                          <h3>{memberName(member)}</h3>
                          <p>{member.email || 'Adresse indisponible'}</p>
                          <span>
                            Accès ajouté le {formatEventDate(member.assignedAt)}
                          </span>
                        </div>
                        <button
                          className="button button-outline"
                          disabled={isBusy}
                          onClick={() => {
                            setRemoval(member)
                            setNotice('')
                            assign.reset()
                            revoke.reset()
                          }}
                        >
                          Retirer l’accès
                        </button>
                      </div>
                      {removal?.id === member.id && (
                        <div
                          className="team-revoke"
                          role="group"
                          aria-label={`Retirer l’accès de ${memberName(member)}`}
                        >
                          <p>
                            Retirer l’accès de {memberName(member)} au contrôle
                            de cet événement ?
                          </p>
                          <button
                            className="button button-primary"
                            disabled={isBusy}
                            onClick={() => revoke.mutate(member.id)}
                          >
                            {revoke.isPending
                              ? 'Retrait…'
                              : 'Confirmer le retrait'}
                          </button>
                          <button
                            className="button button-outline"
                            disabled={isBusy}
                            onClick={() => setRemoval(null)}
                          >
                            Conserver l’accès
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <PageControls
                  page={page}
                  totalPages={staff.data.totalPages}
                  onPage={setPage}
                />
              </>
            ) : (
              <div className="empty-state">
                <UserGroupIcon />
                <h2>Votre équipe se prépare.</h2>
                <p>
                  Ajoutez une personne avec l’adresse e-mail de son compte
                  Tickr. Vous conservez vous-même l’accès en tant
                  qu’organisateur.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
