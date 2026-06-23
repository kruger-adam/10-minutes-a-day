import { auth } from '@clerk/nextjs/server'
import { getUserSessions, upsertSession, migrate } from '@/lib/db'
import type { JournalSession } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await migrate()
  const sessions = await getUserSessions(userId)
  return Response.json(sessions)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const session: JournalSession = await request.json()
  await migrate()
  await upsertSession(userId, session)
  return Response.json({ ok: true })
}
