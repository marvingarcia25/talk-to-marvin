export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChat(messages: ChatMessage[], fetchFn: typeof fetch = fetch): Promise<string> {
  const res = await fetchFn('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error(`chat failed: ${res.status}`)
  const data = (await res.json()) as { reply: string }
  return data.reply
}
