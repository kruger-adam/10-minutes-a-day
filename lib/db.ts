import { neon } from '@neondatabase/serverless'
import type { JournalSession } from './types'

const sql = neon(process.env.DATABASE_URL!)

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      entry TEXT NOT NULL,
      analysis TEXT NOT NULL DEFAULT '',
      duration INTEGER NOT NULL DEFAULT 0
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx
    ON sessions(user_id, created_at DESC)
  `
  await sql`
    CREATE TABLE IF NOT EXISTS user_memory (
      user_id TEXT PRIMARY KEY,
      memory TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function getUserMemory(userId: string): Promise<string> {
  const rows = await sql`SELECT memory FROM user_memory WHERE user_id = ${userId}`
  return rows[0]?.memory ?? ''
}

export async function setUserMemory(userId: string, memory: string): Promise<void> {
  await sql`
    INSERT INTO user_memory (user_id, memory, updated_at)
    VALUES (${userId}, ${memory}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      memory = EXCLUDED.memory,
      updated_at = NOW()
  `
}

export async function computeStreak(userId: string): Promise<number> {
  const rows = await sql`
    SELECT DISTINCT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
    FROM sessions
    WHERE user_id = ${userId}
    ORDER BY day DESC
  `
  if (rows.length === 0) return 0

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const days = rows.map((r) => r.day as string)

  // Streak must include today or yesterday to be active
  if (days[0] !== today && days[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export async function getUserSessions(userId: string): Promise<JournalSession[]> {
  const rows = await sql`
    SELECT id, created_at, entry, analysis, duration
    FROM sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entry: r.entry,
    analysis: r.analysis,
    duration: r.duration,
  }))
}

export async function getSessionById(id: string, userId: string): Promise<JournalSession | null> {
  const rows = await sql`
    SELECT id, created_at, entry, analysis, duration
    FROM sessions
    WHERE id = ${id} AND user_id = ${userId}
  `
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id,
    createdAt: r.created_at,
    entry: r.entry,
    analysis: r.analysis,
    duration: r.duration,
  }
}

export async function upsertSession(
  userId: string,
  session: JournalSession
): Promise<void> {
  await sql`
    INSERT INTO sessions (id, user_id, created_at, entry, analysis, duration)
    VALUES (${session.id}, ${userId}, ${session.createdAt}, ${session.entry}, ${session.analysis}, ${session.duration})
    ON CONFLICT (id) DO UPDATE SET
      analysis = EXCLUDED.analysis,
      duration = EXCLUDED.duration
  `
}
