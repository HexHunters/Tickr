import { AuthExperience } from '@/components/design/auth-experience'
import { readSearchValue } from '@/lib/format'
export const metadata = { title: 'Confirmer mon e-mail' }
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return (
    <AuthExperience
      mode="verify"
      token={readSearchValue(params.token)}
      email={readSearchValue(params.email)}
    />
  )
}
