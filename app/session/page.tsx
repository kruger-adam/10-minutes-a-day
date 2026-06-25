'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'

const DURATION = 5 * 60

export default function SessionPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [started, setStarted] = useState(false)
  const [entry, setEntry] = useState(() =>
    typeof window !== 'undefined' ? (sessionStorage.getItem('session_draft') ?? '') : ''
  )
  const [interimText, setInterimText] = useState('')
  const [listening, setListening] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [speechSupported] = useState(() =>
    typeof window !== 'undefined'
      ? !!(window.SpeechRecognition || (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)
      : true
  )

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (entry) sessionStorage.setItem('session_draft', entry)
  }, [entry])

  // Auto-grow textarea and scroll container to bottom whenever entry or interim text changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
    if (mainRef.current) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight
    }
  }, [entry, interimText])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recognitionRef.current) {
        listeningRef.current = false
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startTimer = useCallback(() => {
    if (started) return
    setStarted(true)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [started])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const toggleSpeech = () => {
    if (listening) {
      listeningRef.current = false
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setListening(false)
      setEntry(prev => prev + (prev && interimText ? ' ' : '') + interimText)
      setInterimText('')
      wakeLockRef.current?.release()
      wakeLockRef.current = null
      return
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      (window as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      if (final.trim()) {
        setEntry(prev => prev + (prev ? ' ' : '') + final.trim())
        setInterimText('')
      }
      if (interim) {
        setInterimText(interim)
      }
    }

    recognition.onend = () => {
      if (listeningRef.current && recognitionRef.current) {
        try { recognition.start() } catch {}
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        listeningRef.current = false
        recognitionRef.current = null
        setListening(false)
      }
    }

    recognitionRef.current = recognition
    listeningRef.current = true
    recognition.start()
    setListening(true)
    if (!started) startTimer()
    navigator.wakeLock?.request('screen').then(lock => { wakeLockRef.current = lock }).catch(() => {})
  }

  const handleSubmit = async () => {
    if (!entry.trim() || submitting) return

    listeningRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (timerRef.current) clearInterval(timerRef.current)

    setSubmitting(true)

    const id = Date.now().toString()
    const elapsed = started ? DURATION - timeLeft : 0
    const session = {
      id,
      createdAt: new Date().toISOString(),
      entry: entry.trim(),
      analysis: '',
      duration: elapsed,
    }

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })

    sessionStorage.removeItem('session_draft')
    router.push(`/analysis?id=${id}`)
  }

  const timeFraction = timeLeft / DURATION
  const timerColor =
    timeLeft === 0 ? 'text-green-400'
    : timeFraction > 0.5 ? 'text-stone-100'
    : timeFraction > 0.2 ? 'text-amber-400'
    : 'text-red-400'

  const timedOut = timeLeft === 0
  const wordCount = (entry + (interimText ? ' ' + interimText : '')).trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="h-dvh flex flex-col bg-stone-950">
      <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-stone-800">
        <button
          onClick={() => router.push('/')}
          className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
        >
          Back
        </button>

        <div className={`text-3xl font-mono font-bold tabular-nums ${timerColor}`}>
          {timedOut ? "Time's up" : formatTime(timeLeft)}
        </div>

        <div className="w-12" />
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-6 pt-5 pb-2">
        {!started && (
          <p className="mb-5 text-stone-500 text-sm">
            Use your keyboard mic or tap &quot;Use mic&quot; below. The timer begins when you start.
          </p>
        )}

        {timedOut && (
          <p className="mb-5 text-amber-400 text-sm">
            Five minutes done. Add a final thought if you&apos;d like, then submit.
          </p>
        )}

        <textarea
          ref={textareaRef}
          value={entry + (interimText ? (entry ? ' ' : '') + interimText : '')}
          onChange={(e) => {
            setInterimText('')
            setEntry(e.target.value)
            if (!started) startTimer()
          }}
          onFocus={() => {
            if (!started) startTimer()
          }}
          placeholder="Let your thoughts flow..."
          rows={1}
          className="w-full bg-transparent text-stone-100 text-lg leading-relaxed placeholder:text-stone-700 resize-none overflow-hidden outline-none"
        />
      </main>

      <footer className="flex-none px-6 py-4 border-t border-stone-800 flex items-center justify-between gap-4 relative">
        {wordCount > 0 && (
          <span className="text-stone-600 text-xs absolute left-1/2 -translate-x-1/2">{wordCount} words</span>
        )}
        {speechSupported ? (
          <button
            onClick={toggleSpeech}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              listening
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-stone-500'}`} />
            {listening ? 'Stop mic' : 'Use mic'}
          </button>
        ) : (
          <div />
        )}

        {entry.trim() && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold px-6 py-2 rounded-full text-sm transition-colors"
          >
            {submitting ? 'One moment...' : timedOut ? 'See my reflection' : "I'm done"}
          </button>
        )}
      </footer>
    </div>
  )
}
