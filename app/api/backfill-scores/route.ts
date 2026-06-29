import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)
const anthropic = new Anthropic()

async function scoreText(text: string): Promise<number | null> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    system: 'You score mood and energy from journal text. Respond with only a single integer: -2 (very heavy/depleted), -1 (low/flat), 0 (neutral/mixed), 1 (good/calm), or 2 (energized/uplifted). Nothing else.',
    messages: [{ role: 'user', content: text.slice(0, 500) }],
  })
  const n = parseInt((msg.content[0] as { text: string }).text.trim())
  return isNaN(n) ? null : Math.max(-2, Math.min(2, n))
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT id, analysis, entry
    FROM sessions
    WHERE user_id = ${userId}
      AND mood_score IS NULL
      AND analysis != ''
    ORDER BY created_at DESC
    LIMIT 5
  `

  const results = []
  for (const row of rows) {
    // Prefer the Mood & energy line; fall back to first 500 chars of entry
    const moodLine = row.analysis.match(/\*\*Mood & energy\*\*\s*\n([^\n]+)/)?.[1]
    const textToScore = moodLine ?? row.entry
    const score = await scoreText(textToScore)
    if (score !== null) {
      await sql`UPDATE sessions SET mood_score = ${score} WHERE id = ${row.id} AND user_id = ${userId}`
      results.push({ id: row.id, score })
    }
  }

  return Response.json({ updated: results.length, results })
}
