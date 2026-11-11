import { MfaChallenge } from '@/components/design/mfa-experience'
import { readSearchValue } from '@/lib/format'

export const metadata = { title: 'Vérification en deux étapes' }

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <MfaChallenge returnTo={readSearchValue(params.returnTo)} />
}
