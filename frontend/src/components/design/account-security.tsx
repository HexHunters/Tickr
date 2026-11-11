'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

import { RecoveryCodes } from '@/components/design/mfa-experience'
import { mfaStatusSchema, recoveryCodesSchema } from '@/lib/api/mfa-contracts'
import { requestApi } from '@/lib/api/request'
import { formatEventDate } from '@/lib/format'
import { mfaError, normalizeTotpInput } from '@/lib/mfa'

import type { FormEvent } from 'react'

const LOW_RECOVERY_CODES = 3

/**
 * Two-factor status and recovery codes, for accounts that use it
 * (administrators). Hidden for everyone else.
 */
export function AccountSecurity({ email }: { email: string }) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const status = useQuery({
    queryKey: ['mfa-status'],
    queryFn: () => requestApi('users/me/mfa', mfaStatusSchema),
    retry: false,
  })
  const regenerate = useMutation({
    mutationFn: (current: string) =>
      requestApi('users/me/mfa/recovery-codes', recoveryCodesSchema, {
        method: 'POST',
        body: JSON.stringify({ code: current }),
      }),
    onSuccess: async () => {
      setCode('')
      await queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: () => setCode(''),
  })

  if (!status.data || (!status.data.enabled && !status.data.required))
    return null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    regenerate.mutate(code)
  }

  const remaining = status.data.remainingRecoveryCodes
  return (
    <section className="settings-section" id="securite">
      <div className="settings-section-heading">
        <h2>Un second verrou.</h2>
        <p>
          Vérification en deux étapes avec une application d’authentification.
        </p>
      </div>
      <div className="account-form">
        <p className="mfa-status">
          <ShieldCheckIcon />
          {status.data.enabled && status.data.enabledAt
            ? `Activée depuis le ${formatEventDate(status.data.enabledAt, true)}.`
            : 'À configurer lors de votre prochaine connexion.'}
        </p>
        {status.data.enabled && (
          <p
            className={
              remaining <= LOW_RECOVERY_CODES ? 'form-error' : 'field-help'
            }
            role={remaining <= LOW_RECOVERY_CODES ? 'alert' : undefined}
          >
            {remaining > 0
              ? `${remaining} code${remaining > 1 ? 's' : ''} de récupération disponible${remaining > 1 ? 's' : ''}.`
              : 'Plus aucun code de récupération.'}
            {remaining <= LOW_RECOVERY_CODES && ' Générez-en de nouveaux.'}
          </p>
        )}
        {regenerate.isSuccess ? (
          <RecoveryCodes codes={regenerate.data.recoveryCodes} email={email} />
        ) : (
          status.data.enabled && (
            <form onSubmit={submit} className="mfa-regenerate">
              <label>
                Code de votre application
                <input
                  className="mfa-code-input"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  disabled={regenerate.isPending}
                  onChange={(event) =>
                    setCode(normalizeTotpInput(event.target.value))
                  }
                />
              </label>
              <p className="field-help">
                Les codes actuels cesseront de fonctionner immédiatement.
              </p>
              {regenerate.isError && (
                <p className="form-error" role="alert">
                  {mfaError(regenerate.error)}
                </p>
              )}
              <button
                className="button button-outline"
                disabled={regenerate.isPending || code.length !== 6}
              >
                {regenerate.isPending
                  ? 'Génération…'
                  : 'Générer de nouveaux codes'}
                <KeyIcon />
              </button>
            </form>
          )
        )}
      </div>
    </section>
  )
}
