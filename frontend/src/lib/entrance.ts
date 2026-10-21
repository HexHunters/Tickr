import { ApiError, friendlyError } from '@/lib/api/request'

export function checkInError(error: unknown): string {
  if (!(error instanceof ApiError) || error.status >= 500)
    return 'Résultat non confirmé. Vérifiez le billet avant une nouvelle tentative.'
  if (error.status === 400) {
    if (/already checked in/i.test(error.message))
      return 'Ce billet a déjà été utilisé. Aucune nouvelle entrée n’a été enregistrée.'
    if (/opens at/i.test(error.message))
      return 'Le contrôle n’est pas encore ouvert pour cet événement.'
    if (/closed:|event ended/i.test(error.message))
      return 'Le contrôle est fermé pour cet événement.'
    if (/format|checksum/i.test(error.message))
      return 'Ce code n’est pas reconnu. Présentez le code du billet Tickr.'
    return 'Entrée refusée. Ce billet ne permet pas l’entrée dans son état actuel.'
  }
  if (error.status === 404)
    return 'Aucun billet ne correspond à ce code pour cet événement.'
  if (error.status === 403)
    return 'Vous n’avez plus accès au contrôle de cet événement.'
  return friendlyError(error)
}

export function teamError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'Ce compte fait déjà partie de l’équipe.'
    if (error.status === 422)
      return 'Indiquez l’adresse d’un compte Tickr actif et vérifié.'
    if (error.status === 400)
      return 'Cet événement ne permet plus de modifier les accès.'
  }
  return friendlyError(error)
}
