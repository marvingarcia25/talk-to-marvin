import './style.css'
import { sendChat, type ChatMessage } from './chat/client.ts'
import { speak } from './voice/speech.ts'
import { detectMood } from './mood/sentiment.ts'
import { detectRegions } from './avatar/landmarks.ts'
import { Avatar } from './avatar/animator.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#avatar')!
const log = document.querySelector<HTMLDivElement>('#log')!
const form = document.querySelector<HTMLFormElement>('#composer')!
const input = document.querySelector<HTMLInputElement>('#input')!
const history: ChatMessage[] = []
let avatar: Avatar | null = null

function addBubble(role: 'user' | 'bot', text: string): void {
  const div = document.createElement('div')
  div.className = `msg ${role}`
  div.textContent = text
  log.appendChild(div)
  log.scrollTop = log.scrollHeight
}

async function bootAvatar(): Promise<void> {
  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}marvin.jpg`
  await img.decode()
  const regions = await detectRegions(img)
  avatar = new Avatar(canvas, img, regions)
  avatar.start()
}

function say(text: string): void {
  const mood = detectMood(text)
  avatar?.setMood(mood)
  speak(text, {
    onStart: () => avatar?.setSpeaking(true),
    onWord: () => avatar?.pulseMouth(),
    onEnd: () => avatar?.setSpeaking(false),
  })
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  addBubble('user', text)
  history.push({ role: 'user', content: text })
  let reply: string
  try {
    reply = await sendChat(history)
  } catch {
    reply = 'Sorry, I lost my connection — try again.'
  }
  history.push({ role: 'assistant', content: reply })
  addBubble('bot', reply)
  say(reply)
})

bootAvatar().catch((err) => console.error('avatar boot failed', err))
