import { InviteLanding } from '@/components/InviteLanding'
import { safeDecode } from '@/lib/safeDecode'

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <InviteLanding code={safeDecode(code)} />
}
