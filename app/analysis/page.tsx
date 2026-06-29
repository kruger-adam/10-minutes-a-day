'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { JournalSession } from '@/lib/types'

function stripScore(raw: string): { display: string; score?: number } {
  if (!raw.startsWith('SCORE:')) return { display: raw }
  const nlIdx = raw.indexOf('\n')
  if (nlIdx === -1) return { display: '' } // score line not yet complete
  const score = parseInt(raw.slice(6, nlIdx))
  return {
    display: raw.slice(nlIdx + 1),
    score: isNaN(score) ? undefined : Math.max(-2, Math.min(2, score)),
  }
}

function formatAnalysis(text: string): string {
  return '<p>' + text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^→/gm, '<span class="text-amber-400">→</span>')
    .trim()
    .replace(/\n\n+/g, '</p><p style="margin-top:1rem">')
    .replace(/\n/g, '<br/>') + '</p>'
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')

  const [session, setSession] = useState<JournalSession | null>(null)
  const [analysis, setAnalysis] = useState('')
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showFullEntry, setShowFullEntry] = useState(false)
  const hasStarted = useRef(false)
  const analysisBufferRef = useRef('')
  const typewriterActiveRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const startTypewriter = useCallback(() => {
    if (typewriterActiveRef.current) return
    typewriterActiveRef.current = true

    const tick = () => {
      setDisplayed(prev => {
        const target = analysisBufferRef.current
        if (prev.length >= target.length) {
          typewriterActiveRef.current = false
          return prev
        }
        rafRef.current = requestAnimationFrame(tick)
        return target.slice(0, prev.length + 4)
      })
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const streamAnalysis = useCallback(async (s: JournalSession) => {
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
        const { display } = stripScore(fullText)
        analysisBufferRef.current = display
        setAnalysis(fullText)
        startTypewriter()
      }

      const { display: cleanAnalysis, score: moodScore } = stripScore(fullText)

      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, analysis: cleanAnalysis, moodScore }),
      })
      setDone(true)

      fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: s.entry, analysis: cleanAnalysis }),
      })
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }, [startTypewriter])

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      if (!res.ok) { router.replace('/'); return }
      const s: JournalSession = await res.json()
      setSession(s)

      if (s.analysis) {
        setAnalysis(s.analysis)
        setDisplayed(s.analysis)
        setDone(true)
        return
      }

      if (hasStarted.current) return
      hasStarted.current = true
      streamAnalysis(s)
    } catch {
      router.replace('/')
    }
  }, [router, streamAnalysis])

  useEffect(() => {
    if (!id) { router.replace('/'); return }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession(id)
  }, [id, loadSession, router])

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

  const wordCount = session.entry.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.floor(session.duration / 60)
  const seconds = session.duration % 60
  const formattedDuration = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`

  const isTyping = displayed.length < analysis.length || !done

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
        >
          Home
        </button>
        <div className="text-center">
          <p className="text-stone-500 text-sm">{formattedDate}</p>
          <p className="text-stone-600 text-xs mt-0.5">{wordCount} words · {formattedDuration}</p>
        </div>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <section>
          <p className="text-xs uppercase tracking-widest text-stone-600 mb-4">Your entry</p>
          <p className={`text-stone-400 text-sm leading-relaxed whitespace-pre-wrap ${showFullEntry ? '' : 'line-clamp-3'}`}>
            {session.entry}
          </p>
          <button
            onClick={() => setShowFullEntry(v => !v)}
            className="text-stone-600 hover:text-stone-400 text-xs mt-2 transition-colors"
          >
            {showFullEntry ? 'Show less' : 'Show full entry'}
          </button>
        </section>

        <section>
          <p className="text-xs uppercase tracking-widest text-amber-500 mb-6">Reflection</p>

          {displayed ? (
            <div className="text-stone-200 leading-relaxed text-base">
              <div dangerouslySetInnerHTML={{ __html: formatAnalysis(displayed) }} />
              {isTyping && <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse ml-0.5" />}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-stone-500">
              <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
              <span>Reading your entry...</span>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </section>

        {done && !isTyping && (
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
