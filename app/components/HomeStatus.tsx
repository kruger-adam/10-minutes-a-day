'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  createdAt: string
}

function toLocalDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0

  const unique = [...new Set(sessions.map(s => toLocalDateStr(s.createdAt)))].sort().reverse()

  const now = new Date()
  const today = toLocalDateStr(now.toISOString())
  const yesterday = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString())

  if (unique[0] !== today && unique[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diffDays === 1) streak++
    else break
  }
  return streak
}

export default function HomeStatus() {
  const [sessions, setSessions] = useState<Session[] | null>(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(() => setSessions([]))
  }, [])

  const today = toLocalDateStr(new Date().toISOString())
  const todaySession = sessions?.find(s => toLocalDateStr(s.createdAt) === today)
  const streak = sessions ? computeStreak(sessions) : null

  return (
    <>
      {streak ? (
        <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
          <span className="text-lg">🔥</span>
          <span>{streak} day streak</span>
        </div>
      ) : null}

      {todaySession ? (
        <Link
          href={`/analysis?id=${todaySession.id}`}
          className="inline-block bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold px-10 py-4 rounded-full text-lg transition-colors"
        >
          View today&apos;s reflection
        </Link>
      ) : (
        <Link
          href="/session"
          className="inline-block bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-10 py-4 rounded-full text-lg transition-colors"
        >
          Start today&apos;s session
        </Link>
      )}
    </>
  )
}
