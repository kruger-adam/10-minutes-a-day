import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-10">
        <div className="space-y-3">
          <h1 className="text-6xl font-bold tracking-tight">10 Minutes</h1>
          <p className="text-stone-400 text-xl">A daily practice for your mind</p>
        </div>

        <div className="space-y-4 text-stone-300 text-base leading-relaxed text-left">
          <p>
            Every day, set aside 10 minutes to speak your thoughts freely.
            No editing, no judgment — just your unfiltered stream of consciousness.
          </p>
          <p>
            We recommend <strong className="text-stone-100">talking rather than typing</strong>. Your
            thoughts move faster than your fingers. Just press the mic and let it flow.
          </p>
          <p>
            When you're done, an AI coach reflects on what you shared — noticing patterns,
            offering insight, and giving you questions to explore next time.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/session"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-10 py-4 rounded-full text-lg transition-colors"
          >
            Start today's session
          </Link>

          <Link
            href="/history"
            className="text-stone-500 hover:text-stone-400 text-sm transition-colors"
          >
            View past sessions
          </Link>
        </div>
      </div>
    </main>
  )
}
