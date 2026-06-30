import './style.css'
import { sendChat, type ChatMessage } from './chat/client.ts'

const log = document.querySelector<HTMLDivElement>('#log')!
const form = document.querySelector<HTMLFormElement>('#composer')!
const input = document.querySelector<HTMLInputElement>('#input')!
const history: ChatMessage[] = []

function addBubble(role: 'user' | 'bot', text: string): void {
  const div = document.createElement('div')
  div.className = `msg ${role}`
  div.textContent = text
  log.appendChild(div)
  log.scrollTop = log.scrollHeight
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  addBubble('user', text)
  history.push({ role: 'user', content: text })
  const reply = await sendChat(history)
  history.push({ role: 'assistant', content: reply })
  addBubble('bot', reply)
})
