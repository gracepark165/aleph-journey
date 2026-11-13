import { InviteLanding } from '@/components/InviteLanding'

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <InviteLanding code={decodeURIComponent(code)} />
}
