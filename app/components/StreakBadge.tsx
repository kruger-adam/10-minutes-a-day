'use client'

import { useEffect, useState } from 'react'

export default function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/streak')
      .then(r => r.json())
      .then(data => setStreak(data.streak ?? 0))
      .catch(() => setStreak(0))
  }, [])

  if (streak === null || streak === 0) return null

  return (
    <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
      <span className="text-lg">🔥</span>
      <span>
        {streak} {streak === 1 ? 'day' : 'days'} streak
      </span>
    </div>
  )
}
