import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-10">
        <div className="space-y-3">
          <h1 className="text-6xl font-bold tracking-tight">5 Minutes</h1>
          <p className="text-stone-400 text-xl">A daily practice for your mind</p>
        </div>

        <div className="space-y-4 text-stone-300 text-base leading-relaxed text-left">
          <p>
            Every day, set aside 5 minutes to speak your thoughts freely.
            No editing, no judgment — just your unfiltered stream of consciousness.
          </p>
          <p>
            We recommend <strong className="text-stone-100">talking rather than typing</strong>. Your
            thoughts move faster than your fingers. Just press the mic and let it flow.
          </p>
          <p>
            When you&apos;re done, an AI coach reflects on what you shared — noticing patterns,
            offering insight, and giving you questions to explore next time.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Show when="signed-in">
            <Link
              href="/session"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-10 py-4 rounded-full text-lg transition-colors"
            >
              Start today&apos;s session
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/history" className="text-stone-500 hover:text-stone-400 text-sm transition-colors">
                View past sessions
              </Link>
              <UserButton />
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button className="inline-block bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-10 py-4 rounded-full text-lg transition-colors">
                Sign in to get started
              </button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </main>
  )
}
