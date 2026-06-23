import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a warm, perceptive life coach and therapist. Someone has just shared a stream-of-consciousness journal entry with you — unfiltered thoughts spoken or written freely for 10 minutes.

Your job is to help them grow and feel understood. Be specific: reference what they actually said, not generic platitudes. Be warm but honest.

Structure your response in exactly three sections with these headers:

**What I noticed**
Reflect back the key themes, emotions, and patterns you observed. 2-3 paragraphs. Make them feel genuinely seen.

**Something worth sitting with**
One or two specific insights that might open something up for them. Not advice — more like a gentle nudge toward self-awareness.

**For your next session**
Three questions to explore next time. Frame them as invitations. Each on its own line starting with → `

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { entry } = await request.json()

  if (!entry?.trim()) {
    return Response.json({ error: 'No entry provided' }, { status: 400 })
  }

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is my journal entry:\n\n${entry}`,
      },
    ],
  })

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
