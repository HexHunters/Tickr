'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

import { categoryLabels, managedEventSchema } from '@/lib/api/contracts'
import { friendlyError, requestApi } from '@/lib/api/request'
import { tunisInputToIso, tunisInputValue } from '@/lib/organizer'

import type { FormEvent } from 'react'
import type { ManagedEvent } from '@/lib/api/contracts'

interface EventPayload {
  title: string
  description: string
  category: string
  location: { city: string; country: string; address: string }
  startDate: string
  endDate: string
}

export function OrganizerEventForm({ event }: { event?: ManagedEvent }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [validationError, setValidationError] = useState('')
  const save = useMutation({
    mutationFn: async (payload: EventPayload) => {
      if (event) {
        await requestApi(`events/${event.id}`, managedEventSchema, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return event.id
      }
      const created = await requestApi(
        'events',
        z.object({ eventId: z.string() }),
        { method: 'POST', body: JSON.stringify(payload) },
      )
      return created.eventId
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
      if (event)
        await queryClient.invalidateQueries({
          queryKey: ['managed-event', id],
        })
      else router.push(`/organizer/events/${encodeURIComponent(id)}`)
    },
  })
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setValidationError('')
    const fields = new FormData(formEvent.currentTarget)
    const value = (key: string) => String(fields.get(key) || '').trim()
    try {
      const startDate = tunisInputToIso(value('startDate'))
      const endDate = tunisInputToIso(value('endDate'))
      if (Date.parse(endDate) <= Date.parse(startDate))
        throw new Error('La fin doit être après le début de l’événement.')
      if (Date.parse(startDate) <= Date.now())
        throw new Error('Choisissez une date de début à venir.')
      save.mutate({
        title: value('title'),
        description: value('description'),
        category: value('category'),
        location: {
          city: value('city'),
          address: value('address'),
          country: value('country'),
        },
        startDate,
        endDate,
      })
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Vérifiez les dates saisies.',
      )
    }
  }
  return (
    <form className="organizer-form" onSubmit={submit}>
      <fieldset disabled={save.isPending}>
        <legend>Les informations essentielles</legend>
        <label>
          Nom de l’événement
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={event?.title}
            placeholder="Le nom que le public retiendra"
          />
        </label>
        <div className="form-grid">
          <label>
            Catégorie
            <select name="category" defaultValue={event?.category || 'CONCERT'}>
              {Object.entries(categoryLabels).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ville
            <input
              name="city"
              required
              maxLength={100}
              defaultValue={event?.location.city}
              placeholder="Tunis"
            />
          </label>
        </div>
        <label>
          Lieu et adresse
          <input
            name="address"
            maxLength={500}
            defaultValue={event?.location.address || ''}
            placeholder="Nom de la salle, rue…"
          />
        </label>
        <label>
          Pays
          <input
            name="country"
            required
            maxLength={100}
            defaultValue={event?.location.country || 'Tunisie'}
          />
        </label>
        <div className="form-grid">
          <label>
            Début
            <input
              name="startDate"
              type="datetime-local"
              required
              defaultValue={event ? tunisInputValue(event.startDate) : ''}
            />
          </label>
          <label>
            Fin
            <input
              name="endDate"
              type="datetime-local"
              required
              defaultValue={event ? tunisInputValue(event.endDate) : ''}
            />
          </label>
        </div>
        <p className="field-help">
          Tous les horaires sont en heure de Tunis, quel que soit votre lieu de
          connexion.
        </p>
        <label>
          À propos de l’événement
          <textarea
            name="description"
            rows={6}
            maxLength={5000}
            defaultValue={event?.description || ''}
            placeholder="Le programme, les artistes et ce qu’il faut savoir avant de venir."
          />
        </label>
      </fieldset>
      {(validationError || save.isError) && (
        <p className="form-error" role="alert">
          {validationError || friendlyError(save.error)}
        </p>
      )}
      {save.isSuccess && event && (
        <p className="form-success" role="status">
          <CheckCircleIcon />
          Vos modifications sont enregistrées.
        </p>
      )}
      <div className="organizer-form-footer">
        <p>
          {event
            ? 'Les modifications seront enregistrées sur cet événement.'
            : 'Votre brouillon restera privé. Vous pourrez ajouter les tarifs avant de publier.'}
        </p>
        <button className="button button-primary" disabled={save.isPending}>
          {save.isPending
            ? 'Enregistrement…'
            : event
              ? 'Enregistrer les modifications'
              : 'Créer le brouillon'}
          <ArrowRightIcon />
        </button>
      </div>
    </form>
  )
}
