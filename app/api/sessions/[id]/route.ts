import { auth } from '@clerk/nextjs/server'
import { getSessionById } from '@/lib/db'

export async function GET(_req: Request, ctx: RouteContext<'/api/sessions/[id]'>) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const session = await getSessionById(id, userId)
  if (!session) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(session)
}
