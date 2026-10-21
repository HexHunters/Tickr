import { AuthExperience } from '@/components/design/auth-experience'
import { readSearchValue } from '@/lib/format'
export const metadata = { title: 'Se connecter' }
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return (
    <AuthExperience mode="login" returnTo={readSearchValue(params.returnTo)} />
  )
}
