'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  KeyIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

import { mfaSessionSchema, mfaSetupSchema } from '@/lib/api/mfa-contracts'
import { parseResponse } from '@/lib/api/request'
import { safeReturnPath } from '@/lib/format'
import {
  formatSecret,
  isChallengeExpired,
  mfaError,
  normalizeTotpInput,
  recoveryCodesFile,
} from '@/lib/mfa'

import type { FormEvent, ReactNode } from 'react'

function postStep(action: string, body: Record<string, string> = {}) {
  return fetch(`/api/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function MfaShell({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: ReactNode
}) {
  return (
    <main id="contenu" tabIndex={-1} className="auth-layout">
      <div className="auth-form-side">
        <Link href="/auth/login" className="back-link">
          <ArrowLeftIcon />
          Retour à la connexion
        </Link>
        <div className="auth-form-wrap">
          <span className="auth-symbol">
            <ShieldCheckIcon />
          </span>
          <h1>{title}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </div>
        <p className="auth-footnote">
          Un second facteur protège les comptes d’administration.
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
          <span>tickr / Coulisses</span>
          <h2>
            Les coulisses,
            <br />
            bien gardées.
          </h2>
          <p>Ça se vit dehors.</p>
        </div>
      </aside>
    </main>
  )
}

function ChallengeError({ error }: { error: unknown }) {
  return (
    <div className="form-error" role="alert">
      {mfaError(error)}
      {isChallengeExpired(error) && (
        <Link href="/auth/login">Se reconnecter</Link>
      )}
    </div>
  )
}

function CodeField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <label>
      Code à 6 chiffres
      <input
        className="mfa-code-input"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(normalizeTotpInput(event.target.value))}
      />
    </label>
  )
}

/** Recovery codes, shown once: copy, download, and confirm they are saved. */
export function RecoveryCodes({
  codes,
  email,
}: {
  codes: string[]
  email: string
}) {
  const [copied, setCopied] = useState(false)
  const file = recoveryCodesFile(codes, email, new Date())
  return (
    <div className="mfa-recovery">
      <ol className="mfa-recovery-codes" aria-label="Codes de récupération">
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ol>
      <div className="mfa-recovery-actions">
        <button
          type="button"
          className="button button-outline"
          onClick={() =>
            void navigator.clipboard
              ?.writeText(codes.join('\n'))
              .then(() => setCopied(true))
          }
        >
          <ClipboardDocumentIcon />
          {copied ? 'Copiés' : 'Copier'}
        </button>
        <a
          className="button button-outline"
          download="tickr-codes-de-recuperation.txt"
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(file)}`}
        >
          <ArrowDownTrayIcon />
          Télécharger
        </a>
      </div>
      <p className="field-help">
        Chaque code ne sert qu’une fois, si vous n’avez plus accès à votre
        application. Ils ne seront plus affichés : gardez-les hors de ce
        téléphone, par exemple dans un gestionnaire de mots de passe.
      </p>
    </div>
  )
}

export function MfaSetup({ returnTo = '' }: { returnTo?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [isPending, setIsPending] = useState(false)
  const [done, setDone] = useState<{ codes: string[]; email: string } | null>(
    null,
  )
  const [hasSaved, setHasSaved] = useState(false)
  // One secret per visit: never refetch, or the QR code would change under the user.
  const setup = useQuery({
    queryKey: ['mfa-setup'],
    queryFn: async () =>
      parseResponse(await postStep('mfa-enroll-start'), mfaSetupSchema),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)
    try {
      const session = await parseResponse(
        await postStep('mfa-enroll-confirm', { code }),
        mfaSessionSchema,
      )
      queryClient.setQueryData(['session'], session.user)
      setDone({ codes: session.recoveryCodes ?? [], email: session.user.email })
    } catch (failure) {
      setError(failure)
      setCode('')
    } finally {
      setIsPending(false)
    }
  }

  if (done)
    return (
      <MfaShell
        title="Votre compte est protégé."
        intro="Voici vos codes de récupération. C’est la seule fois où ils s’affichent."
      >
        <RecoveryCodes codes={done.codes} email={done.email} />
        <label className="mfa-acknowledge">
          <input
            type="checkbox"
            checked={hasSaved}
            onChange={(event) => setHasSaved(event.target.checked)}
          />
          J’ai conservé ces codes en lieu sûr.
        </label>
        <button
          className="button button-primary full-width"
          disabled={!hasSaved}
          onClick={() => {
            router.replace(safeReturnPath(returnTo))
            router.refresh()
          }}
        >
          Continuer
          <ArrowRightIcon />
        </button>
      </MfaShell>
    )

  return (
    <MfaShell
      title="Protégez l’accès administrateur."
      intro="Avant votre première connexion, associez une application d’authentification à votre compte."
    >
      {setup.isPending ? (
        <p className="field-help" role="status">
          Préparation du code…
        </p>
      ) : setup.isError ? (
        <ChallengeError error={setup.error} />
      ) : (
        <ol className="mfa-steps">
          <li>
            <h2>Installez une application</h2>
            <p>
              Google Authenticator, Microsoft Authenticator, 1Password, Aegis…
              toute application compatible avec les codes à usage unique.
            </p>
          </li>
          <li>
            <h2>Scannez ce code</h2>
            {/* Data URL from the API: next/image cannot optimize it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mfa-qr"
              src={setup.data.qrCodeDataUrl}
              width={200}
              height={200}
              alt="QR code à scanner avec votre application d’authentification"
            />
            <details className="mfa-manual">
              <summary>Impossible de scanner ? Saisir la clé</summary>
              <p>Choisissez une saisie manuelle, type « basé sur l’heure » :</p>
              <code className="mfa-secret">
                {formatSecret(setup.data.secret)}
              </code>
            </details>
          </li>
          <li>
            <h2>Saisissez le code affiché</h2>
            <form
              className="account-form"
              onSubmit={confirm}
              aria-busy={isPending}
            >
              <CodeField value={code} onChange={setCode} disabled={isPending} />
              {error !== null && <ChallengeError error={error} />}
              <button
                className="button button-primary full-width"
                disabled={isPending || code.length !== 6}
              >
                {isPending ? 'Vérification…' : 'Activer et continuer'}
                <ArrowRightIcon />
              </button>
            </form>
          </li>
        </ol>
      )}
    </MfaShell>
  )
}

export function MfaChallenge({ returnTo = '' }: { returnTo?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [useRecovery, setUseRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [isPending, setIsPending] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  function finish() {
    router.replace(safeReturnPath(returnTo))
    router.refresh()
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)
    try {
      const session = await parseResponse(
        await postStep(
          'mfa-verify',
          useRecovery ? { recoveryCode: recoveryCode.trim() } : { code },
        ),
        mfaSessionSchema,
      )
      queryClient.clear()
      queryClient.setQueryData(['session'], session.user)
      if (useRecovery) setRemaining(session.remainingRecoveryCodes ?? 0)
      else finish()
    } catch (failure) {
      setError(failure)
      setCode('')
    } finally {
      setIsPending(false)
    }
  }

  if (remaining !== null)
    return (
      <MfaShell
        title="Vous êtes connecté."
        intro="Vous avez utilisé un code de récupération."
      >
        <div className="auth-success" role="status">
          <CheckCircleIcon />
          <p>
            {remaining > 0
              ? `Il vous reste ${remaining} code${remaining > 1 ? 's' : ''} de récupération.`
              : 'Vous n’avez plus de code de récupération.'}{' '}
            Si vous avez perdu votre téléphone, générez de nouveaux codes depuis
            Mon compte dès que possible.
          </p>
        </div>
        <Link
          className="button button-outline full-width"
          href="/account#securite"
        >
          <KeyIcon />
          Gérer ma sécurité
        </Link>
        <button className="button button-primary full-width" onClick={finish}>
          Continuer
          <ArrowRightIcon />
        </button>
      </MfaShell>
    )

  return (
    <MfaShell
      title="Encore un code."
      intro={
        useRecovery
          ? 'Saisissez l’un de vos codes de récupération. Il ne servira qu’une fois.'
          : 'Ouvrez votre application d’authentification et saisissez le code affiché pour Tickr.'
      }
    >
      <form className="account-form" onSubmit={verify} aria-busy={isPending}>
        {useRecovery ? (
          <label>
            Code de récupération
            <input
              className="mfa-code-input"
              name="recoveryCode"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXXX-XXXXX"
              maxLength={13}
              required
              autoFocus
              disabled={isPending}
              value={recoveryCode}
              onChange={(event) =>
                setRecoveryCode(event.target.value.toUpperCase())
              }
            />
          </label>
        ) : (
          <CodeField value={code} onChange={setCode} disabled={isPending} />
        )}
        {error !== null && <ChallengeError error={error} />}
        <button
          className="button button-primary full-width"
          disabled={
            isPending ||
            (useRecovery ? recoveryCode.trim().length < 10 : code.length !== 6)
          }
        >
          {isPending ? 'Vérification…' : 'Se connecter'}
          <ArrowRightIcon />
        </button>
      </form>
      <button
        type="button"
        className="text-link mfa-switch"
        onClick={() => {
          setUseRecovery(!useRecovery)
          setError(null)
        }}
      >
        {useRecovery
          ? 'Utiliser mon application d’authentification'
          : 'Je n’ai pas accès à mon application'}
      </button>
    </MfaShell>
  )
}
