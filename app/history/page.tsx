'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSessions } from '@/lib/storage'
import type { JournalSession } from '@/lib/types'

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<JournalSession[]>([])

  useEffect(() => {
    setSessions(getSessions())
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
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {sessions.length === 0 ? (
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
        )}
      </main>
    </div>
  )
}
