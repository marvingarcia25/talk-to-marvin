import { describe, it, expect, vi } from 'vitest'
import { sendChat } from './client.ts'

describe('sendChat', () => {
  it('posts messages and returns the reply', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'hello back' }),
    }) as unknown as typeof fetch
    const reply = await sendChat([{ role: 'user', content: 'hi' }], fetchFn)
    expect(reply).toBe('hello back')
    expect(fetchFn).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('throws on non-ok response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch
    await expect(sendChat([{ role: 'user', content: 'hi' }], fetchFn)).rejects.toThrow(/500/)
  })
})
