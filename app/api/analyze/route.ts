import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

function buildSystemPrompt(memory: string) {
  const memorySection = memory
    ? `\n\nYou have an ongoing relationship with this person. Here is your running memory of who they are, their patterns, and their life context:\n\n<memory>\n${memory}\n</memory>\n\nUse this to personalize your reflection — notice when something connects to past patterns, when they're making progress on something they've struggled with, or when something new and significant is emerging. Reference it naturally, not mechanically.`
    : ''

  return `You are a warm, perceptive life coach and therapist. Someone has just shared a stream-of-consciousness journal entry with you — unfiltered thoughts spoken or written freely for 5 minutes.${memorySection}

Your job is to help them grow and feel understood. Be specific: reference what they actually said, not generic platitudes. Be warm but honest.

Structure your response in exactly five sections with these headers:

**Mood & energy**
One sentence read on how they were feeling — their emotional tone and energy level. Be specific and grounded in what they said.

**What I noticed**
Reflect back the key themes, emotions, and patterns you observed. 2-3 paragraphs. Make them feel genuinely seen.

**Something worth sitting with**
One or two specific insights that might open something up for them. Not advice — more like a gentle nudge toward self-awareness.

**For your next session**
Three questions to explore next time. Frame them as invitations. Each on its own line starting with →

**Action items**
A bulleted list of any concrete tasks, intentions, or to-dos the person mentioned. Only include things they explicitly brought up — do not invent or suggest new ones. If there are none, omit this section entirely.`
}

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { entry, memory } = await request.json()

  if (!entry?.trim()) {
    return Response.json({ error: 'No entry provided' }, { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: buildSystemPrompt(memory ?? ''),
          messages: [
            {
              role: 'user',
              content: `Here is my journal entry:\n\n${entry}`,
            },
          ],
        })

        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
