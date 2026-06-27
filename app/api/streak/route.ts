import { auth } from '@clerk/nextjs/server'
import { computeStreak, migrate } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await migrate()
  const streak = await computeStreak(userId)
  return Response.json({ streak })
}
