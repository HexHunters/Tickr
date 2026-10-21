'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

import {
  DataState,
  LoadingState,
  SessionGate,
} from '@/components/design/data-state'
import { AccountNavigation } from '@/components/design/account-navigation'
import { preferencesSchema } from '@/lib/api/contracts'
import { friendlyError, requestApi } from '@/lib/api/request'

import type { NotificationPreferences } from '@/lib/api/contracts'

const options = [
  {
    name: 'emailEnabled',
    label: 'Par e-mail',
    description: 'Recevoir les messages facultatifs sur votre adresse e-mail.',
  },
  {
    name: 'smsEnabled',
    label: 'Par SMS',
    description:
      'Autoriser les messages facultatifs sur votre numéro de téléphone, lorsqu’ils sont disponibles.',
  },
  {
    name: 'eventRemindersEnabled',
    label: 'Rappels de sortie',
    description: 'Recevoir les rappels liés à vos prochains événements.',
  },
  {
    name: 'marketingEnabled',
    label: 'Les nouvelles de Tickr',
    description:
      'Recevoir les communications et les nouveautés de Tickr. Ce choix reste facultatif.',
  },
] satisfies {
  name: keyof Omit<NotificationPreferences, 'userId'>
  label: string
  description: string
}[]

function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const [values, setValues] = useState(initial)
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: () =>
      requestApi('notifications/preferences/me', preferencesSchema, {
        method: 'PUT',
        body: JSON.stringify({
          emailEnabled: values.emailEnabled,
          smsEnabled: values.smsEnabled,
          marketingEnabled: values.marketingEnabled,
          eventRemindersEnabled: values.eventRemindersEnabled,
        }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-preferences'], data)
      setValues(data)
    },
  })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
      className="preferences-form"
    >
      <fieldset disabled={save.isPending}>
        <legend>Vos préférences de communication</legend>
        {options.map((option) => (
          <label className="preference-row" key={option.name}>
            <div>
              <strong>{option.label}</strong>
              <p id={`help-${option.name}`}>{option.description}</p>
            </div>
            <input
              type="checkbox"
              aria-label={option.label}
              checked={values[option.name]}
              aria-describedby={`help-${option.name}`}
              onChange={(event) => {
                setValues({ ...values, [option.name]: event.target.checked })
                save.reset()
              }}
            />
            <span className="preference-switch" aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      <p className="preferences-essential">
        <BellIcon />
        Les confirmations de commande et les informations essentielles à vos
        billets restent actives.
      </p>
      {save.isError && (
        <p className="form-error" role="alert">
          {friendlyError(save.error)}
        </p>
      )}
      {save.isSuccess && (
        <p className="form-success" role="status">
          <CheckCircleIcon />
          Vos préférences sont enregistrées.
        </p>
      )}
      <button className="button button-primary" disabled={save.isPending}>
        {save.isPending ? 'Enregistrement…' : 'Enregistrer mes préférences'}
      </button>
    </form>
  )
}
function PreferencesContent() {
  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      requestApi('notifications/preferences/me', preferencesSchema),
    retry: false,
  })
  if (preferences.isPending) return <LoadingState />
  if (preferences.isError)
    return (
      <DataState
        error={preferences.error}
        onRetry={() => void preferences.refetch()}
      />
    )
  return (
    <div className="preferences-layout">
      <PreferencesForm initial={preferences.data} />
      <aside>
        <h2>Juste ce qui vous parle.</h2>
        <p>
          Vous choisissez les messages que vous souhaitez recevoir. Vous pouvez
          revenir sur ces choix à tout moment.
        </p>
      </aside>
    </div>
  )
}
export function NotificationPreferencesPage() {
  return (
    <main id="contenu" tabIndex={-1} className="container account-main">
      <div className="account-page-heading">
        <p className="section-caption">Votre espace</p>
        <h1>On garde le lien.</h1>
        <p>Les messages utiles, selon vos envies.</p>
      </div>
      <AccountNavigation active="notifications" />
      <SessionGate>
        <PreferencesContent />
      </SessionGate>
    </main>
  )
}
