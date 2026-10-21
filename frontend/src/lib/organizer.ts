export const eventStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
}

export function tunisInputValue(value: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === name)?.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

export function tunisInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Indiquez une date et une heure valides.')
  // Resolve the offset for the selected date, independently of the browser's timezone.
  const provisional = new Date(`${value}:00Z`)
  if (!Number.isFinite(provisional.getTime()))
    throw new Error('Indiquez une date et une heure valides.')
  const offset =
    new Intl.DateTimeFormat('en', {
      timeZone: 'Africa/Tunis',
      timeZoneName: 'longOffset',
    })
      .formatToParts(provisional)
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '+00:00'
  const date = new Date(`${value}:00${offset}`)
  if (
    !Number.isFinite(date.getTime()) ||
    tunisInputValue(date.toISOString()) !== value
  )
    throw new Error('Indiquez une date et une heure valides.')
  return date.toISOString()
}
