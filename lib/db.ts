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
