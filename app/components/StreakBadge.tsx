'use client'

import { useEffect, useState } from 'react'

function toLocalDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeStreak(sessions: { createdAt: string }[]): number {
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

export default function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then((sessions: { createdAt: string }[]) => setStreak(computeStreak(sessions)))
      .catch(() => setStreak(0))
  }, [])

  if (streak === null || streak === 0) return null

  return (
    <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
      <span className="text-lg">🔥</span>
      <span>{streak} day streak</span>
    </div>
  )
}
