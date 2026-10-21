export function formatMoney(millimes: number, currency = 'TND'): string {
  return `${new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(millimes / 1000)} ${currency === 'TND' ? 'DT' : currency}`
}
export function formatEventDate(value: string, full = false): string {
  return new Intl.DateTimeFormat('fr-TN', {
    weekday: full ? 'long' : 'short',
    day: 'numeric',
    month: full ? 'long' : 'short',
    ...(full ? { year: 'numeric' } : {}),
    timeZone: 'Africa/Tunis',
  }).format(new Date(value))
}
export function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat('fr-TN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Africa/Tunis',
  }).format(new Date(value))
}
export function readSearchValue(value?: string | string[]): string {
  return typeof value === 'string' ? value : (value?.[0] ?? '')
}
export function readQuantity(value?: string, max = 6): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= max ? n : 1
}
export function safeReturnPath(value?: string): string {
  return value?.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\u0000-\u0020\\]/.test(value)
    ? value
    : '/tickets'
}
