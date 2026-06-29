export type JournalSession = {
  id: string
  createdAt: string
  entry: string
  analysis: string
  duration: number // seconds elapsed
  moodScore?: number // -2 to 2, derived from AI analysis
}
