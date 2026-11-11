import { ApiError, friendlyError } from '@/lib/api/request'

/** Keeps only digits, as authenticator apps display them (max 6). */
export function normalizeTotpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

/** Groups the manual-entry key in blocks of 4 for reading aloud or typing. */
export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, '$1 ')
}

export function recoveryCodesFile(
  codes: string[],
  email: string,
  generatedAt: Date,
): string {
  return [
    'Tickr — codes de récupération',
    `Compte : ${email}`,
    `Générés le : ${generatedAt.toISOString().slice(0, 10)}`,
    '',
    'Chaque code ne fonctionne qu’une seule fois, à la place du code de',
    'votre application d’authentification. Conservez-les en lieu sûr.',
    '',
    ...codes,
    '',
  ].join('\n')
}

export function mfaError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_MFA_CODE':
        return 'Ce code ne correspond pas. Vérifiez que l’heure de votre téléphone est à jour, puis saisissez le code affiché.'
      case 'MFA_LOCKED':
        return 'Trop de codes erronés. Pour protéger votre compte, réessayez dans 15 minutes.'
      case 'MFA_CHALLENGE_EXPIRED':
        return 'Votre connexion a expiré. Saisissez à nouveau votre mot de passe.'
      case 'MFA_ALREADY_ENROLLED':
        return 'Votre application d’authentification est déjà configurée. Connectez-vous avec un code.'
      case 'MFA_ENROLLMENT_NOT_STARTED':
        return 'La configuration a expiré. Reconnectez-vous pour recommencer.'
      case 'MFA_NOT_ENROLLED':
        return 'L’authentification à deux facteurs n’est pas configurée sur ce compte.'
    }
    if (error.status === 400)
      return 'Saisissez le code à 6 chiffres, ou un code de récupération complet.'
  }
  return friendlyError(error)
}

/** The sign-in must start over from the password step. */
export function isChallengeExpired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    ['MFA_CHALLENGE_EXPIRED', 'MFA_ENROLLMENT_NOT_STARTED'].includes(error.code)
  )
}
