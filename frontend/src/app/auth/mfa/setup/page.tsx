import { MfaSetup } from '@/components/design/mfa-experience'
import { readSearchValue } from '@/lib/format'

export const metadata = { title: 'Configurer la vérification en deux étapes' }

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <MfaSetup returnTo={readSearchValue(params.returnTo)} />
}
