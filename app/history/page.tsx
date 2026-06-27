'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JournalSession } from '@/lib/types'

function toLocalDateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function Calendar({ sessions, onDayClick }: { sessions: JournalSession[], onDayClick: (key: string) => void }) {
  const [viewDate, setViewDate] = useState(new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const sessionDays = new Set(sessions.map(s => toLocalDateKey(s.createdAt)))

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const today = new Date()
  const todayKey = toLocalDateKey(today.toISOString())
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-stone-900 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="text-stone-500 hover:text-stone-300 w-6 text-lg leading-none"
        >
          ‹
        </button>
        <p className="text-stone-300 text-sm font-medium">{monthLabel}</p>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          disabled={isCurrentMonth}
          className="text-stone-500 hover:text-stone-300 w-6 text-lg leading-none disabled:opacity-0"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-stone-600 text-xs pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const key = `${year}-${month}-${day}`
          const hasSession = sessionDays.has(key)
          const isToday = key === todayKey
          return (
            <button
              key={i}
              onClick={() => hasSession && onDayClick(key)}
              disabled={!hasSession}
              className={[
                'aspect-square flex items-center justify-center rounded-full text-xs transition-colors',
                isToday ? 'ring-1 ring-amber-500/60' : '',
                hasSession
                  ? 'bg-amber-500 text-stone-950 font-semibold hover:bg-amber-400 cursor-pointer'
                  : 'text-stone-600 cursor-default',
              ].join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<JournalSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

  const formatDuration = (seconds: number) => {
    if (!seconds) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const preview = (entry: string) => {
    const words = entry.trim().split(/\s+/).slice(0, 18).join(' ')
    return entry.trim().split(/\s+/).length > 18 ? words + '…' : words
  }

  const handleDayClick = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    const match = sessions.find(s => {
      const sd = new Date(s.createdAt)
      return sd.getFullYear() === y && sd.getMonth() === m && sd.getDate() === d
    })
    if (match) router.push(`/analysis?id=${match.id}`)
  }

  const handleExport = () => {
    const lines = sessions.map(s => {
      const date = formatDate(s.createdAt)
      const dur = formatDuration(s.duration)
      const parts = [`=== ${date}${dur ? ` (${dur})` : ''} ===`, '', s.entry]
      if (s.analysis) parts.push('', '--- Reflection ---', '', s.analysis)
      return parts.join('\n')
    })
    const blob = new Blob([lines.join('\n\n\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '5-minutes-journal.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
        >
          Home
        </button>
        <p className="text-stone-400 text-sm font-medium">Past sessions</p>
        {sessions.length > 0 ? (
          <button
            onClick={handleExport}
            className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
          >
            Export
          </button>
        ) : (
          <div className="w-12" />
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-stone-500">No sessions yet.</p>
            <button
              onClick={() => router.push('/session')}
              className="text-amber-500 text-sm hover:text-amber-400 transition-colors"
            >
              Start your first session
            </button>
          </div>
        ) : (
          <>
            <Calendar sessions={sessions} onDayClick={handleDayClick} />
            <ul className="space-y-3">
              {sessions.map(session => (
                <li key={session.id}>
                  <button
                    onClick={() => router.push(`/analysis?id=${session.id}`)}
                    className="w-full text-left px-5 py-4 rounded-xl bg-stone-900 hover:bg-stone-800 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-stone-200 text-sm font-medium">
                        {formatDate(session.createdAt)}
                      </p>
                      {formatDuration(session.duration) && (
                        <p className="text-stone-600 text-xs flex-shrink-0">
                          {formatDuration(session.duration)}
                        </p>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm leading-relaxed">
                      {preview(session.entry)}
                    </p>
                    {session.analysis && (
                      <p className="text-amber-600 text-xs">Reflection available</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
