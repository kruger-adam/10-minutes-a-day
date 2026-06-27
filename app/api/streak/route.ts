import { auth } from '@clerk/nextjs/server'
import { computeStreak, migrate } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await migrate()
  try {
    const streak = await computeStreak(userId)
    return Response.json({ streak })
  } catch (e) {
    return Response.json({ error: String(e), streak: 0 }, { status: 500 })
  }
}
