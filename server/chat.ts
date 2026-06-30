import type { Request, Response } from 'express'
import { buildSystemPrompt } from './persona.ts'

export { buildSystemPrompt }

export interface MessageClient {
  messages: {
    create(args: {
      model: string
      max_tokens: number
      system: string
      messages: Array<{ role: string; content: string }>
    }): Promise<{ content: Array<{ type: string; text?: string }> }>
  }
}

export function createChatHandler(client: MessageClient, personaText: string) {
  const system = buildSystemPrompt(personaText)
  return async function handler(req: Request, res: Response): Promise<void> {
    const messages = (req.body?.messages ?? []) as Array<{ role: string; content: string }>
    try {
      const resp = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 400, system, messages })
      const reply = resp.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim()
      res.json({ reply: reply || '…' })
    } catch (err) {
      console.error('chat error', err)
      res.status(200).json({ reply: 'Sorry, my brain glitched — try again.' })
    }
  }
}
