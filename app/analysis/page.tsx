'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { JournalSession } from '@/lib/types'

function AnalysisContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')

  const [session, setSession] = useState<JournalSession | null>(null)
  const [analysis, setAnalysis] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showEntry, setShowEntry] = useState(false)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!id) { router.replace('/'); return }
    loadSession(id)
  }, [id])

  async function loadSession(sessionId: string) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      if (!res.ok) { router.replace('/'); return }
      const s: JournalSession = await res.json()
      setSession(s)

      if (s.analysis) {
        setAnalysis(s.analysis)
        setDone(true)
        return
      }

      if (hasStarted.current) return
      hasStarted.current = true
      streamAnalysis(s)
    } catch {
      router.replace('/')
    }
  }

  async function streamAnalysis(s: JournalSession) {
    try {
      const memoryRes = await fetch('/api/memory')
      const { memory } = memoryRes.ok ? await memoryRes.json() : { memory: '' }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: s.entry, memory }),
      })

      if (!response.ok) throw new Error('Analysis failed')
      if (!response.body) throw new Error('No stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done: readerDone, value } = await reader.read()
        if (readerDone) break
        fullText += decoder.decode(value, { stream: true })
        setAnalysis(fullText)
      }

      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, analysis: fullText }),
      })
      setDone(true)

      // Update memory in background — don't await
      fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: s.entry, analysis: fullText }),
      })
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  const formattedDate = new Date(session.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const formattedAnalysis = analysis
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^→/gm, '<span class="text-amber-400">→</span>')
    .split('\n')
    .map(line => line || '<br/>')
    .join('\n')

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
        >
          Home
        </button>
        <p className="text-stone-500 text-sm">{formattedDate}</p>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <section>
          <p className="text-xs uppercase tracking-widest text-amber-500 mb-6">Your reflection</p>

          {analysis ? (
            <div className="text-stone-200 leading-relaxed text-base space-y-4">
              <div
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formattedAnalysis }}
              />
              {!done && <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse" />}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-stone-500">
              <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
              <span>Reading your entry...</span>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </section>

        {done && (
          <>
            <section>
              <button
                onClick={() => setShowEntry(v => !v)}
                className="text-xs uppercase tracking-widest text-stone-600 hover:text-stone-400 transition-colors flex items-center gap-2"
              >
                <span className={`transition-transform ${showEntry ? 'rotate-90' : ''}`}>▶</span>
                Your entry
              </button>
              {showEntry && (
                <p className="mt-4 text-stone-500 text-sm leading-relaxed whitespace-pre-wrap">
                  {session.entry}
                </p>
              )}
            </section>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/session')}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-6 py-3 rounded-full text-sm transition-colors"
              >
                Start another session
              </button>
              <button
                onClick={() => router.push('/history')}
                className="text-stone-500 hover:text-stone-400 text-sm transition-colors"
              >
                All sessions
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense>
      <AnalysisContent />
    </Suspense>
  )
}
