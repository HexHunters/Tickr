import { OrganizerWorkspace } from '@/components/organizer/workspace'
import { TeamManager } from '@/components/entrance/team-manager'

export const metadata = { title: 'L’équipe d’entrée' }
export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <OrganizerWorkspace>
      <TeamManager key={id} id={id} />
    </OrganizerWorkspace>
  )
}
