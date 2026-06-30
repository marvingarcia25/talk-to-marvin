import { describe, it, expect, vi } from 'vitest'
import { buildSystemPrompt, createChatHandler } from './chat.ts'

function mockRes() {
  return {
    statusCode: 200,
    body: null as unknown,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
  }
}

describe('buildSystemPrompt', () => {
  it('embeds the persona text', () => {
    const prompt = buildSystemPrompt('I am Marvin.')
    expect(prompt).toContain('I am Marvin.')
  })
})

describe('createChatHandler', () => {
  it('returns the model reply text', async () => {
    const client = { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'hey there' }] }) } }
    const handler = createChatHandler(client, 'persona')
    const res = mockRes()
    await handler({ body: { messages: [{ role: 'user', content: 'hi' }] } } as any, res as any)
    expect(res.body).toEqual({ reply: 'hey there' })
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5', max_tokens: 400 }),
    )
  })

  it('returns a fallback reply on client error', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('boom')) } }
    const handler = createChatHandler(client, 'persona')
    const res = mockRes()
    await handler({ body: { messages: [{ role: 'user', content: 'hi' }] } } as any, res as any)
    expect(res.statusCode).toBe(200)
    expect((res.body as { reply: string }).reply).toMatch(/glitched/i)
  })
})
