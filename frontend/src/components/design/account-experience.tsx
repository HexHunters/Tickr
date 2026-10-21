'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

import { DataState, SessionGate } from '@/components/design/data-state'
import { AccountNavigation } from '@/components/design/account-navigation'
import { useSession } from '@/components/session-provider'
import { userSchema } from '@/lib/api/contracts'
import { friendlyError, requestApi } from '@/lib/api/request'

import type { FormEvent } from 'react'

function AccountForm() {
  const { user, logout } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [logoutError, setLogoutError] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const profile = useMutation({
    mutationFn: (payload: {
      firstName: string
      lastName: string
      phone: string
    }) =>
      requestApi('users/me', userSchema, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => queryClient.setQueryData(['session'], data),
  })
  const password = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      requestApi('users/me/password', z.object({ message: z.string() }), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  })
  if (!user) return null
  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    profile.mutate({
      firstName: String(fields.get('firstName')).trim(),
      lastName: String(fields.get('lastName')).trim(),
      phone: String(fields.get('phone')).trim(),
    })
  }
  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const next = String(fields.get('newPassword'))
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}/.test(next)) {
      setPasswordError(
        'Choisissez 8 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.',
      )
      return
    }
    if (next !== String(fields.get('confirmPassword'))) {
      setPasswordError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setPasswordError('')
    password.mutate(
      {
        currentPassword: String(fields.get('currentPassword')),
        newPassword: next,
      },
      { onSuccess: () => form.reset() },
    )
  }
  async function signOut() {
    try {
      await logout()
      router.push('/auth/login')
      router.refresh()
    } catch {
      setLogoutError(true)
    }
  }
  return (
    <div className="account-settings-layout">
      <div>
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Vous, tout simplement.</h2>
            <p>Les informations associées à vos réservations.</p>
          </div>
          <form className="account-form" onSubmit={updateProfile}>
            <div className="form-two">
              <label>
                Prénom
                <input
                  name="firstName"
                  defaultValue={user.firstName}
                  autoComplete="given-name"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </label>
              <label>
                Nom
                <input
                  name="lastName"
                  defaultValue={user.lastName}
                  autoComplete="family-name"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </label>
            </div>
            <label>
              Adresse e-mail
              <input type="email" value={user.email} readOnly />
              <span className="field-help">
                Cette adresse identifie votre compte.
              </span>
            </label>
            <label>
              Téléphone
              <input
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ''}
                autoComplete="tel"
                pattern="(\+216[2-9][0-9]{7})?"
                placeholder="+216…"
              />
              <span className="field-help">
                Numéro tunisien au format +216, suivi de 8 chiffres.
              </span>
            </label>
            {profile.isError && (
              <p className="form-error" role="alert">
                {friendlyError(profile.error)}
              </p>
            )}
            {profile.isSuccess && (
              <p className="form-success" role="status">
                <CheckCircleIcon />
                Vos informations sont enregistrées.
              </p>
            )}
            <button
              className="button button-primary"
              disabled={profile.isPending}
            >
              {profile.isPending
                ? 'Enregistrement…'
                : 'Enregistrer mes informations'}
              <ArrowRightIcon />
            </button>
          </form>
        </section>
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Un accès bien à vous.</h2>
            <p>Modifiez votre mot de passe.</p>
          </div>
          <form className="account-form" onSubmit={updatePassword}>
            <input
              type="email"
              hidden
              name="username"
              autoComplete="username"
              value={user.email}
              readOnly
            />
            <label>
              Mot de passe actuel
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
              />
            </label>
            <div className="form-two">
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </label>
              <label>
                Confirmation
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </label>
            </div>
            <p className="field-help">
              8 caractères minimum, avec majuscule, minuscule, chiffre et
              caractère spécial.
            </p>
            {(passwordError || password.isError) && (
              <p className="form-error" role="alert">
                {passwordError || friendlyError(password.error)}
              </p>
            )}
            {password.isSuccess && (
              <p className="form-success" role="status">
                <CheckCircleIcon />
                Votre nouveau mot de passe est enregistré.
              </p>
            )}
            <button
              className="button button-outline"
              disabled={password.isPending}
            >
              {password.isPending
                ? 'Enregistrement…'
                : 'Modifier mon mot de passe'}
              <LockClosedIcon />
            </button>
          </form>
        </section>
      </div>
      <aside className="account-side-note">
        <span className="profile-initial">{user.firstName.slice(0, 1)}</span>
        <h2>
          {user.firstName},<br />
          on sort bientôt ?
        </h2>
        <p>Vos billets et réservations vous suivent dans votre espace.</p>
        <button className="text-link" onClick={() => void signOut()}>
          Se déconnecter
          <ArrowRightIcon />
        </button>
        {logoutError && <DataState error={null} />}
      </aside>
    </div>
  )
}
export function AccountPageContent() {
  return (
    <main id="contenu" tabIndex={-1} className="container account-main">
      <div className="account-page-heading">
        <p className="section-caption">Votre espace</p>
        <h1>Mon compte.</h1>
        <p>Les détails pratiques, pour profiter du reste.</p>
      </div>
      <AccountNavigation active="account" />
      <SessionGate>
        <AccountForm />
      </SessionGate>
    </main>
  )
}
