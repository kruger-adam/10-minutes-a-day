import type { JournalSession } from './types'

const KEY = 'ten_minutes_sessions'

export function getSessions(): JournalSession[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getSession(id: string): JournalSession | null {
  return getSessions().find(s => s.id === id) ?? null
}

export function upsertSession(session: JournalSession): void {
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === session.id)
  if (idx >= 0) {
    sessions[idx] = session
  } else {
    sessions.unshift(session)
  }
  localStorage.setItem(KEY, JSON.stringify(sessions))
}
