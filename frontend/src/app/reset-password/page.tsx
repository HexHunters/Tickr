import { AuthExperience } from '@/components/design/auth-experience'
import { readSearchValue } from '@/lib/format'
export const metadata = { title: 'Nouveau mot de passe' }
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <AuthExperience mode="reset" token={readSearchValue(params.token)} />
}
