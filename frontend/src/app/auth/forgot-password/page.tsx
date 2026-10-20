import { AuthExperience } from '@/components/design/auth-experience'
export const metadata = { title: 'Mot de passe oublié' }
export default function ForgotPasswordPage() {
  return <AuthExperience mode="forgot" />
}
