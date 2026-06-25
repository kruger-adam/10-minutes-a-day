import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserMemory, setUserMemory } from '@/lib/db'

export const maxDuration = 60

const anthropic = new Anthropic()

const UPDATE_PROMPT = `You maintain a running memory document about a journaling app user — like a therapist's longitudinal notes on a client. Your job is to update this document based on a new journal entry and its analysis.

The memory document should capture:
- Key life context (family, relationships, job, living situation)
- Recurring emotional themes and patterns
- Significant life events and milestones
- Goals, intentions, and things they're working on
- Progress or regression on ongoing struggles
- Personality traits and tendencies that have emerged

Rules:
- Be concise — bullet points, not paragraphs
- Update or remove outdated facts (e.g. if they mentioned a goal they've now achieved)
- Add new significant things from this session
- Do NOT include every small detail — only things that would matter to a therapist months from now
- Keep the total document under 400 words
- Return ONLY the updated memory document, no preamble`

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const memory = await getUserMemory(userId)
  return Response.json({ memory })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { entry, analysis } = await request.json()
  if (!entry?.trim()) return Response.json({ error: 'No entry' }, { status: 400 })

  const currentMemory = await getUserMemory(userId)

  const userMessage = currentMemory
    ? `Current memory document:\n\n${currentMemory}\n\n---\n\nNew journal entry:\n${entry}\n\n---\n\nAnalysis of this entry:\n${analysis}`
    : `This is the user's first session.\n\nJournal entry:\n${entry}\n\n---\n\nAnalysis of this entry:\n${analysis}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: UPDATE_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const updatedMemory = response.content[0].type === 'text' ? response.content[0].text : ''
  if (updatedMemory) await setUserMemory(userId, updatedMemory)

  return Response.json({ ok: true })
}
