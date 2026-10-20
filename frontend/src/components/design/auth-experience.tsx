'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

import { userSchema } from '@/lib/api/contracts'
import { ApiError, parseResponse } from '@/lib/api/request'
import { safeReturnPath } from '@/lib/format'

import type { FormEvent } from 'react'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify'
const content = {
  login: {
    title: 'On se retrouve ?',
    intro: 'Vos prochaines sorties vous attendent.',
    button: 'Se connecter',
  },
  register: {
    title: 'La prochaine fois, vous y êtes.',
    intro: 'Un compte pour toutes vos sorties.',
    button: 'Créer mon compte',
  },
  forgot: {
    title: 'On garde votre place.',
    intro: 'Indiquez votre e-mail pour recevoir un lien de réinitialisation.',
    button: 'Recevoir le lien',
  },
  reset: {
    title: 'Un nouveau départ.',
    intro: 'Choisissez un nouveau mot de passe pour retrouver votre espace.',
    button: 'Enregistrer le mot de passe',
  },
  verify: {
    title: 'Encore un petit pas.',
    intro: 'Confirmez votre adresse e-mail pour retrouver vos billets.',
    button: 'Confirmer mon adresse',
  },
}

export function AuthExperience({
  mode,
  token = '',
  email = '',
  returnTo = '',
}: {
  mode: AuthMode
  token?: string
  email?: string
  returnTo?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isVerificationNeeded, setIsVerificationNeeded] = useState(false)
  const copy = content[mode]
  const showPassword = ['login', 'register', 'reset'].includes(mode)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    const fields = new FormData(event.currentTarget)
    const value = (name: string) => String(fields.get(name) ?? '').trim()
    const password = String(fields.get('password') ?? '')
    if (
      ['register', 'reset'].includes(mode) &&
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}/.test(password)
    ) {
      setError(
        'Choisissez au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.',
      )
      return
    }
    if (
      mode === 'reset' &&
      password !== String(fields.get('confirmPassword') ?? '')
    ) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setError('')
    setIsPending(true)
    setIsVerificationNeeded(false)
    const action =
      mode === 'forgot'
        ? 'request-reset'
        : mode === 'reset'
          ? 'reset-password'
          : mode === 'verify'
            ? token
              ? 'verify-email'
              : 'resend-verification'
            : mode
    const payload =
      mode === 'login'
        ? { email: value('email'), password }
        : mode === 'register'
          ? {
              email: value('email'),
              password,
              firstName: value('firstName'),
              lastName: value('lastName'),
              ...(value('phone') ? { phone: value('phone') } : {}),
            }
          : mode === 'reset'
            ? { token, newPassword: password }
            : mode === 'verify' && token
              ? { token }
              : { email: value('email') }
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (mode === 'login') {
        const result = await parseResponse(
          response,
          z.object({ user: userSchema }),
        )
        queryClient.clear()
        queryClient.setQueryData(['session'], result.user)
        router.replace(safeReturnPath(returnTo))
        router.refresh()
        return
      }
      await parseResponse(response, z.object({ message: z.string() }))
      if (mode === 'register') {
        router.push(`/verify-email?email=${encodeURIComponent(value('email'))}`)
        return
      }
      setSuccess(
        mode === 'reset'
          ? 'Votre mot de passe est enregistré. Vous pouvez maintenant vous connecter.'
          : mode === 'verify' && token
            ? 'Votre adresse e-mail est confirmée. Votre prochaine sortie vous attend.'
            : 'Si un compte correspond à cette adresse, vous recevrez un e-mail avec la suite des instructions.',
      )
    } catch (failure) {
      setIsVerificationNeeded(
        mode === 'login' &&
          failure instanceof ApiError &&
          failure.status === 403,
      )
      setError(
        failure instanceof ApiError && failure.status === 429
          ? 'Trop de demandes. Patientez quelques minutes avant de réessayer.'
          : failure instanceof ApiError && failure.status >= 500
            ? 'Le service est momentanément indisponible. Réessayez dans un instant.'
            : mode === 'login'
              ? 'Vérifiez votre e-mail et votre mot de passe. Votre adresse doit être confirmée pour vous connecter.'
              : mode === 'reset' || (mode === 'verify' && token)
                ? 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.'
                : 'La demande n’a pas abouti. Vérifiez les informations et réessayez.',
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main id="contenu" tabIndex={-1} className="auth-layout">
      <div className="auth-form-side">
        <Link href="/events" className="back-link">
          <ArrowLeftIcon />
          Retour aux sorties
        </Link>
        <div className="auth-form-wrap">
          <span className="auth-symbol">
            <EnvelopeIcon />
          </span>
          <h1>{copy.title}</h1>
          <p className="auth-intro">{copy.intro}</p>
          {success ? (
            <div className="auth-success" role="status">
              <CheckCircleIcon />
              <p>{success}</p>
              <Link className="button button-primary" href="/auth/login">
                Se connecter
                <ArrowRightIcon />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="account-form"
              aria-busy={isPending}
            >
              {mode === 'register' && (
                <div className="form-two">
                  <label>
                    Prénom
                    <input
                      name="firstName"
                      autoComplete="given-name"
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      name="lastName"
                      autoComplete="family-name"
                      required
                      maxLength={100}
                    />
                  </label>
                </div>
              )}
              {mode !== 'reset' && !(mode === 'verify' && token) && (
                <label>
                  Adresse e-mail
                  <input
                    type="email"
                    name="email"
                    defaultValue={email}
                    autoComplete="email"
                    placeholder="vous@exemple.tn"
                    required
                    maxLength={254}
                  />
                </label>
              )}
              {mode === 'register' && (
                <label>
                  Téléphone <span className="optional-label">facultatif</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+216…"
                    pattern="\+?[1-9][0-9]{1,14}"
                  />
                </label>
              )}
              {showPassword && (
                <label>
                  {mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}
                  <span className="password-field">
                    <input
                      name="password"
                      aria-label={
                        mode === 'reset'
                          ? 'Nouveau mot de passe'
                          : 'Mot de passe'
                      }
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      required
                      minLength={mode === 'login' ? 1 : 8}
                      aria-describedby={
                        mode !== 'login' ? 'password-hint' : undefined
                      }
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={
                        isPasswordVisible
                          ? 'Masquer le mot de passe'
                          : 'Afficher le mot de passe'
                      }
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </span>
                  {mode !== 'login' && (
                    <span className="field-help" id="password-hint">
                      8 caractères minimum, majuscule, minuscule, chiffre et
                      caractère spécial.
                    </span>
                  )}
                </label>
              )}
              {mode === 'reset' && (
                <label>
                  Confirmer le mot de passe
                  <input
                    name="confirmPassword"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </label>
              )}
              {mode === 'reset' && !token && (
                <div className="form-error" role="alert">
                  Le lien de réinitialisation est manquant.{' '}
                  <Link href="/auth/forgot-password">
                    Demander un nouveau lien
                  </Link>
                </div>
              )}
              {mode === 'verify' && !token && (
                <p className="field-help">
                  Ouvrez le lien reçu par e-mail, ou demandez-en un nouveau
                  ci-dessous.
                </p>
              )}
              {mode === 'login' && (
                <Link className="auth-forgot" href="/auth/forgot-password">
                  Mot de passe oublié ?
                </Link>
              )}
              {error && (
                <div className="form-error" role="alert">
                  {error}
                  {isVerificationNeeded && (
                    <Link href="/verify-email">
                      Renvoyer un lien de confirmation
                    </Link>
                  )}
                  {(mode === 'reset' || mode === 'verify') && (
                    <Link
                      href={
                        mode === 'reset'
                          ? '/auth/forgot-password'
                          : '/verify-email'
                      }
                    >
                      Demander un nouveau lien
                    </Link>
                  )}
                </div>
              )}
              <button
                className="button button-primary full-width"
                disabled={isPending || (mode === 'reset' && !token)}
              >
                {isPending
                  ? 'Un instant…'
                  : mode === 'verify' && !token
                    ? 'Renvoyer le lien'
                    : copy.button}
                <ArrowRightIcon />
              </button>
            </form>
          )}
          {mode === 'login' ? (
            <p className="auth-switch">
              Pas encore de compte ?{' '}
              <Link href="/auth/register">Rejoignez la scène</Link>
            </p>
          ) : (
            <p className="auth-switch">
              Déjà un compte ? <Link href="/auth/login">Se connecter</Link>
            </p>
          )}
        </div>
        <p className="auth-footnote">
          Votre compte. Vos billets. Vos bons moments.
        </p>
      </div>
      <aside className="auth-art">
        <Image
          src="/images/live-crowd.jpg"
          alt="Un public de concert réuni face à la scène. Photographie illustrative."
          fill
          sizes="(max-width: 900px) 0px, 45vw"
        />
        <div className="auth-art-copy">
          <span>tickr / En scène</span>
          <h2>
            La prochaine fois,
            <br />
            on y est.
          </h2>
          <p>Ça se vit dehors.</p>
        </div>
      </aside>
    </main>
  )
}
