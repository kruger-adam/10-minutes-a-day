'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { upsertSession } from '@/lib/storage'

const DURATION = 10 * 60

export default function SessionPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [started, setStarted] = useState(false)
  const [entry, setEntry] = useState('')
  const [listening, setListening] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const draft = sessionStorage.getItem('session_draft')
    if (draft) setEntry(draft)

    const hasSpeech = !!(window.SpeechRecognition || (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)
    setSpeechSupported(hasSpeech)
  }, [])

  useEffect(() => {
    if (entry) sessionStorage.setItem('session_draft', entry)
  }, [entry])

  // Auto-scroll textarea to bottom when speech adds text
  useEffect(() => {
    if (listening && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [entry, listening])

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
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    textareaRef.current?.focus()
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
      return
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      (window as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map(r => r[0].transcript)
        .join(' ')
        .trim()
      if (transcript) {
        setEntry(prev => prev + (prev ? ' ' : '') + transcript)
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

    upsertSession({
      id,
      createdAt: new Date().toISOString(),
      entry: entry.trim(),
      analysis: '',
      duration: elapsed,
    })

    sessionStorage.removeItem('session_draft')
    router.push(`/analysis?id=${id}`)
  }

  const timeFraction = timeLeft / DURATION
  const timerColor =
    timeFraction > 0.5
      ? 'text-stone-100'
      : timeFraction > 0.2
        ? 'text-amber-400'
        : 'text-red-400'

  const timedOut = timeLeft === 0

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
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

      <main className="flex-1 flex flex-col px-6 pt-6 pb-2 max-w-2xl mx-auto w-full">
        {!started && (
          <p className="mb-5 text-stone-500 text-sm">
            {speechSupported
              ? 'Tap the mic to speak, or just start typing. The timer begins when you do.'
              : 'Start typing — the timer begins when you do.'}
          </p>
        )}

        {timedOut && (
          <p className="mb-5 text-amber-400 text-sm">
            Ten minutes done. Add a final thought if you'd like, then submit whenever you're ready.
          </p>
        )}

        <textarea
          ref={textareaRef}
          value={entry}
          onChange={(e) => {
            setEntry(e.target.value)
            if (!started) startTimer()
          }}
          onFocus={() => {
            if (!started) startTimer()
          }}
          placeholder="Let your thoughts flow..."
          className="flex-1 w-full bg-transparent text-stone-100 text-lg leading-relaxed placeholder:text-stone-700 resize-none outline-none min-h-[300px]"
        />
      </main>

      <footer className="px-6 py-4 border-t border-stone-800 flex items-center justify-between gap-4 max-w-2xl mx-auto w-full">
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
