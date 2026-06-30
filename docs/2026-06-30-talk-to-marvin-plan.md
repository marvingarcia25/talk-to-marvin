# Talk to Marvin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local browser app where you type a message and an animated living-portrait of Marvin's face replies out loud, in his persona, mouth and expression reacting while it speaks.

**Architecture:** Vite + vanilla-TS frontend (canvas avatar + chat box) talks to a tiny Express backend that proxies the Claude API with a persona system prompt. The browser's built-in `SpeechSynthesis` speaks each reply; word-boundary events drive a canvas animator that pulses the mouth, blinks, sways, and tints by mood.

**Tech Stack:** Vite, TypeScript, Express, `@anthropic-ai/sdk`, `@mediapipe/tasks-vision`, browser `SpeechSynthesis`, Vitest.

## Global Constraints

- Node ESM throughout (`"type": "module"`); use `.ts` extension imports (Vite bundler mode, `allowImportingTsExtensions`).
- Frontend never sees the Claude API key — all model calls go through the backend.
- Model: `claude-haiku-4-5`, `max_tokens: 400`.
- Backend listens on port `8787`; Vite dev server on `5173` proxies `/api` → `8787`.
- The Claude call must never crash the UI: on error the backend returns HTTP 200 with a friendly fallback reply.
- Photo lives at `public/marvin.jpg` (copied from `C:\Users\marvi\Downloads\1591910044424.jpg`).
- Test runner: Vitest, `environment: 'node'`. Tests must not require real browser DOM or network.
- Commit after every task with the message shown in its final step.

---

## File Structure

```
day30_TalkToMarvin/
├── index.html                # app shell, #app mount
├── package.json              # scripts + deps
├── tsconfig.json             # TS bundler config (mirrors day28)
├── vite.config.ts            # base path + /api proxy
├── vitest.config.ts          # node test env
├── .env.example              # ANTHROPIC_API_KEY=
├── .gitignore
├── persona.md                # Marvin's personality (system prompt source)
├── public/
│   └── marvin.jpg            # the source photo
├── server/
│   ├── persona.ts            # buildSystemPrompt(personaText) — pure
│   ├── chat.ts               # createChatHandler(client, personaText) — testable
│   └── index.ts              # wires Anthropic + Express + persona file
└── src/
    ├── main.ts               # wires UI → chat → voice → avatar
    ├── style.css
    ├── chat/
    │   └── client.ts         # sendChat(messages) → reply text
    ├── voice/
    │   └── speech.ts         # speak(text, handlers, deps) — boundary→onWord
    ├── mood/
    │   └── sentiment.ts      # detectMood(text) → Mood
    └── avatar/
        ├── landmarks.ts      # fallbackRegions + detectRegions
        ├── renderer.ts       # drawFrame(ctx, img, regions, frame)
        └── animator.ts       # Avatar class + computeFrame(now, state)
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.env.example`, `.gitignore`, `persona.md`, `src/style.css`, `src/main.ts`
- Asset: copy photo to `public/marvin.jpg`

**Interfaces:**
- Produces: a runnable dev environment. `npm run dev` serves the page; `npm run server` boots the backend; `npm test` runs Vitest.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "talk-to-marvin",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server": "tsx watch server/index.ts",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.40.0",
    "@mediapipe/tasks-vision": "^0.10.0",
    "express": "^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^26.0.0",
    "tsx": "^4.19.0",
    "typescript": "~6.0.2",
    "vite": "^8.0.12",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`** (mirrors day28, adds `vitest/globals` not needed — using imports)

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "lib": ["ES2023", "DOM"],
    "types": ["vite/client", "node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "server"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/day30-talk-to-marvin/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Talk to Marvin</title>
  </head>
  <body>
    <div id="app">
      <canvas id="avatar" width="400" height="400"></canvas>
      <div id="log"></div>
      <form id="composer">
        <input id="input" type="text" placeholder="Say something to Marvin…" autocomplete="off" />
        <button type="submit">Send</button>
      </form>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/style.css`** (minimal, centered column)

```css
:root { color-scheme: dark; font-family: system-ui, sans-serif; }
body { margin: 0; background: #111; color: #eee; }
#app { max-width: 460px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
#avatar { border-radius: 12px; background: #000; }
#log { width: 100%; height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.msg { padding: 8px 12px; border-radius: 10px; max-width: 80%; }
.msg.user { align-self: flex-end; background: #2a4d69; }
.msg.bot { align-self: flex-start; background: #333; }
#composer { width: 100%; display: flex; gap: 8px; }
#input { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #444; background: #1a1a1a; color: #eee; }
button { padding: 10px 16px; border-radius: 8px; border: 0; background: #2a4d69; color: #fff; cursor: pointer; }
```

- [ ] **Step 7: Create placeholder `src/main.ts`** (wired fully in Task 9)

```ts
import './style.css'

console.log('Talk to Marvin — booting')
```

- [ ] **Step 8: Create `persona.md`** (starter Marvin fills in later)

```markdown
# Marvin

You are Marvin, replying as yourself in a casual chat.

## Voice
- Friendly, concise, a little playful. Short sentences. No corporate filler.
- You speak in the first person ("I think…", "honestly…").

## About me
- I build small projects and share them publicly.
- (Add a few real facts and opinions here so replies sound like you.)

## Rules
- Keep replies to 1–3 sentences — this is spoken out loud.
- If you don't know something about Marvin's life, say so lightly instead of inventing specifics.
```

- [ ] **Step 9: Create `.env.example` and `.gitignore`**

`.env.example`:
```
ANTHROPIC_API_KEY=
```

`.gitignore`:
```
node_modules/
dist/
.env
```

- [ ] **Step 10: Copy the photo into `public/`**

Run:
```bash
mkdir -p public && cp "/c/Users/marvi/Downloads/1591910044424.jpg" public/marvin.jpg
```
Expected: `public/marvin.jpg` exists.

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` populated.

- [ ] **Step 12: Verify dev server boots**

Run: `npm run dev` (then Ctrl-C)
Expected: Vite prints `Local: http://localhost:5173/day30-talk-to-marvin/`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Talk to Marvin (Vite + TS + Express)"
```

---

### Task 2: Backend persona prompt + chat handler

**Files:**
- Create: `server/persona.ts`, `server/chat.ts`, `server/index.ts`
- Test: `server/chat.test.ts`

**Interfaces:**
- Produces:
  - `buildSystemPrompt(personaText: string): string`
  - `createChatHandler(client: MessageClient, personaText: string): (req, res) => Promise<void>` where `MessageClient = { messages: { create(args): Promise<{ content: Array<{ type: string; text?: string }> }> } }`
  - Endpoint contract: `POST /api/chat { messages: Array<{role,content}> } → { reply: string }`

- [ ] **Step 1: Write the failing test** — `server/chat.test.ts`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/chat.test.ts`
Expected: FAIL — cannot find module `./chat.ts`.

- [ ] **Step 3: Write `server/persona.ts`**

```ts
export function buildSystemPrompt(personaText: string): string {
  return [
    'You are role-playing as a real person in a short spoken chat.',
    'Stay in character. Replies are read aloud, so keep them to 1–3 short sentences.',
    '',
    '--- PERSONA ---',
    personaText.trim(),
  ].join('\n')
}
```

- [ ] **Step 4: Write `server/chat.ts`**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- server/chat.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write `server/index.ts`** (wiring; not unit-tested)

```ts
import express from 'express'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { createChatHandler, type MessageClient } from './chat.ts'

const here = dirname(fileURLToPath(import.meta.url))
const personaText = readFileSync(join(here, '..', 'persona.md'), 'utf8')
const client = new Anthropic() as unknown as MessageClient

const app = express()
app.use(express.json())
app.post('/api/chat', createChatHandler(client, personaText))
app.listen(8787, () => console.log('Marvin brain on http://localhost:8787'))
```

- [ ] **Step 7: Smoke-test the server** (requires a real key in `.env`; skip if unset)

Run: `node --env-file=.env server/index.ts` is not valid for TS — use `npm run server`, then in another shell:
```bash
curl -s -X POST http://localhost:8787/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"hi"}]}'
```
Expected: JSON `{"reply":"..."}`. (If no key, you'll get the fallback reply — that's fine.)

- [ ] **Step 8: Commit**

```bash
git add server tsconfig.json
git commit -m "feat: backend chat handler with persona prompt + fallback"
```

---

### Task 3: Frontend chat client + minimal UI

**Files:**
- Create: `src/chat/client.ts`
- Test: `src/chat/client.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `POST /api/chat` from Task 2.
- Produces:
  - `interface ChatMessage { role: 'user' | 'assistant'; content: string }`
  - `sendChat(messages: ChatMessage[], fetchFn?: typeof fetch): Promise<string>`

- [ ] **Step 1: Write the failing test** — `src/chat/client.test.ts`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/chat/client.test.ts`
Expected: FAIL — cannot find module `./client.ts`.

- [ ] **Step 3: Write `src/chat/client.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/chat/client.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire minimal UI in `src/main.ts`** (text-only round trip; voice + avatar added later)

```ts
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
```

- [ ] **Step 6: Manual check** — run `npm run server` and `npm run dev`, open the page, type a message, confirm a reply bubble appears.

- [ ] **Step 7: Commit**

```bash
git add src/chat src/main.ts
git commit -m "feat: frontend chat client + text round trip"
```

---

### Task 4: Voice (SpeechSynthesis wrapper)

**Files:**
- Create: `src/voice/speech.ts`
- Test: `src/voice/speech.test.ts`

**Interfaces:**
- Produces:
  - `interface SpeakHandlers { onStart?(): void; onWord?(): void; onEnd?(): void }`
  - `interface SpeechDeps { synth: SpeechSynthesis; createUtterance(text: string): SpeechSynthesisUtterance }`
  - `speak(text: string, handlers: SpeakHandlers, deps?: SpeechDeps): void`

- [ ] **Step 1: Write the failing test** — `src/voice/speech.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest'
import { speak } from './speech.ts'

function fakeDeps() {
  const utter: any = {}
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn((u: any) => {
      u.onstart?.()
      u.onboundary?.({ name: 'word' })
      u.onboundary?.({ name: 'word' })
      u.onend?.()
    }),
  }
  return {
    deps: { synth: synth as any, createUtterance: () => utter as any },
    synth,
  }
}

describe('speak', () => {
  it('fires start, one onWord per boundary, then end', () => {
    const { deps, synth } = fakeDeps()
    const onStart = vi.fn(), onWord = vi.fn(), onEnd = vi.fn()
    speak('two words', { onStart, onWord, onEnd }, deps)
    expect(synth.cancel).toHaveBeenCalled()
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onWord).toHaveBeenCalledTimes(2)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/voice/speech.test.ts`
Expected: FAIL — cannot find module `./speech.ts`.

- [ ] **Step 3: Write `src/voice/speech.ts`**

```ts
export interface SpeakHandlers {
  onStart?(): void
  onWord?(): void
  onEnd?(): void
}

export interface SpeechDeps {
  synth: SpeechSynthesis
  createUtterance(text: string): SpeechSynthesisUtterance
}

function defaultDeps(): SpeechDeps {
  return {
    synth: window.speechSynthesis,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
  }
}

export function speak(text: string, handlers: SpeakHandlers, deps: SpeechDeps = defaultDeps()): void {
  deps.synth.cancel()
  const u = deps.createUtterance(text)
  u.onstart = () => handlers.onStart?.()
  u.onboundary = (e) => {
    if (e.name === 'word' || e.name === undefined) handlers.onWord?.()
  }
  u.onend = () => handlers.onEnd?.()
  u.onerror = () => handlers.onEnd?.()
  deps.synth.speak(u)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/voice/speech.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/voice
git commit -m "feat: SpeechSynthesis wrapper with word-boundary callbacks"
```

---

### Task 5: Mood detection

**Files:**
- Create: `src/mood/sentiment.ts`
- Test: `src/mood/sentiment.test.ts`

**Interfaces:**
- Produces:
  - `type Mood = 'neutral' | 'happy' | 'sad' | 'excited'`
  - `detectMood(text: string): Mood`

- [ ] **Step 1: Write the failing test** — `src/mood/sentiment.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { detectMood } from './sentiment.ts'

describe('detectMood', () => {
  it('detects happy', () => {
    expect(detectMood('I love this, so glad!')).toBe('happy')
  })
  it('detects sad', () => {
    expect(detectMood('sorry, that is unfortunately bad')).toBe('sad')
  })
  it('detects excited from exclamation', () => {
    expect(detectMood('wow this is amazing!!')).toBe('excited')
  })
  it('defaults to neutral', () => {
    expect(detectMood('the meeting is at three')).toBe('neutral')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/mood/sentiment.test.ts`
Expected: FAIL — cannot find module `./sentiment.ts`.

- [ ] **Step 3: Write `src/mood/sentiment.ts`**

```ts
export type Mood = 'neutral' | 'happy' | 'sad' | 'excited'

const EXCITED = ['wow', 'amazing', 'incredible', "let's go", 'awesome']
const HAPPY = ['glad', 'great', 'love', 'nice', 'haha', 'happy', 'wonderful', 'thanks']
const SAD = ['sorry', 'sad', 'unfortunately', 'bad', 'worried', 'afraid']

function count(text: string, words: string[]): number {
  return words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0)
}

export function detectMood(text: string): Mood {
  const t = text.toLowerCase()
  const exclaims = (t.match(/!/g) ?? []).length
  if (count(t, EXCITED) > 0 || exclaims >= 2) return 'excited'
  if (count(t, SAD) > count(t, HAPPY)) return 'sad'
  if (count(t, HAPPY) > 0) return 'happy'
  return 'neutral'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/mood/sentiment.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mood
git commit -m "feat: keyword-based mood detection"
```

---

### Task 6: Avatar landmarks (regions + fallback)

**Files:**
- Create: `src/avatar/landmarks.ts`
- Test: `src/avatar/landmarks.test.ts`

**Interfaces:**
- Produces:
  - `interface Region { x: number; y: number; width: number; height: number }` (pixels)
  - `interface FaceRegions { leftEye: Region; rightEye: Region; mouth: Region }`
  - `fallbackRegions(w: number, h: number): FaceRegions`
  - `detectRegions(image: HTMLImageElement): Promise<FaceRegions>` (uses MediaPipe; returns `fallbackRegions` on any failure)

- [ ] **Step 1: Write the failing test** — `src/avatar/landmarks.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { fallbackRegions } from './landmarks.ts'

describe('fallbackRegions', () => {
  it('places mouth in the lower-center and eyes in the upper half', () => {
    const r = fallbackRegions(400, 400)
    // mouth roughly horizontally centered
    const mouthCx = r.mouth.x + r.mouth.width / 2
    expect(mouthCx).toBeGreaterThan(150)
    expect(mouthCx).toBeLessThan(250)
    // mouth below vertical center
    expect(r.mouth.y).toBeGreaterThan(200)
    // eyes above vertical center
    expect(r.leftEye.y).toBeLessThan(200)
    expect(r.rightEye.y).toBeLessThan(200)
    // left eye left of right eye
    expect(r.leftEye.x).toBeLessThan(r.rightEye.x)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/avatar/landmarks.test.ts`
Expected: FAIL — cannot find module `./landmarks.ts`.

- [ ] **Step 3: Write `src/avatar/landmarks.ts`**

```ts
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceRegions {
  leftEye: Region
  rightEye: Region
  mouth: Region
}

export function fallbackRegions(w: number, h: number): FaceRegions {
  return {
    leftEye: { x: w * 0.30, y: h * 0.36, width: w * 0.16, height: h * 0.08 },
    rightEye: { x: w * 0.54, y: h * 0.36, width: w * 0.16, height: h * 0.08 },
    mouth: { x: w * 0.36, y: h * 0.62, width: w * 0.28, height: h * 0.10 },
  }
}

// Landmark index sets (MediaPipe FaceLandmarker, 468 pts).
const MOUTH = [61, 291, 0, 17, 13, 14]
const LEFT_EYE = [33, 133, 159, 145]
const RIGHT_EYE = [362, 263, 386, 374]

function boxFrom(
  points: Array<{ x: number; y: number }>,
  ids: number[],
  w: number,
  h: number,
  padX: number,
  padY: number,
): Region {
  const xs = ids.map((i) => points[i].x * w)
  const ys = ids.map((i) => points[i].y * h)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return {
    x: minX - padX,
    y: minY - padY,
    width: maxX - minX + padX * 2,
    height: maxY - minY + padY * 2,
  }
}

export async function detectRegions(image: HTMLImageElement): Promise<FaceRegions> {
  const w = image.naturalWidth || image.width
  const h = image.naturalHeight || image.height
  try {
    const files = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
    )
    const landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      runningMode: 'IMAGE',
      numFaces: 1,
    })
    const result = landmarker.detect(image)
    const pts = result.faceLandmarks?.[0]
    if (!pts) return fallbackRegions(w, h)
    return {
      leftEye: boxFrom(pts, LEFT_EYE, w, h, w * 0.02, h * 0.02),
      rightEye: boxFrom(pts, RIGHT_EYE, w, h, w * 0.02, h * 0.02),
      mouth: boxFrom(pts, MOUTH, w, h, w * 0.03, h * 0.03),
    }
  } catch (err) {
    console.warn('landmark detection failed, using fallback', err)
    return fallbackRegions(w, h)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/avatar/landmarks.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/avatar/landmarks.ts src/avatar/landmarks.test.ts
git commit -m "feat: face region detection with proportional fallback"
```

---

### Task 7: Avatar renderer (canvas drawing)

**Files:**
- Create: `src/avatar/renderer.ts`
- Test: `src/avatar/renderer.test.ts`

**Interfaces:**
- Consumes: `FaceRegions`, `Region` from Task 6; `Mood` from Task 5.
- Produces:
  - `interface Frame { mouthOpen: number; blink: number; swayX: number; swayY: number; tilt: number; mood: Mood }` (all 0..1 except sway in px and tilt in radians)
  - `mouthSliceRect(mouth: Region): { src: Region; lift: number }` (pure helper, unit-tested)
  - `drawFrame(ctx: CanvasRenderingContext2D, img: CanvasImageSource, regions: FaceRegions, frame: Frame, size: { w: number; h: number }): void`

- [ ] **Step 1: Write the failing test** — `src/avatar/renderer.test.ts` (test the pure geometry helper only)

```ts
import { describe, it, expect } from 'vitest'
import { mouthSliceRect } from './renderer.ts'

describe('mouthSliceRect', () => {
  it('takes a slice across the lower mouth and reports a positive lift extent', () => {
    const mouth = { x: 100, y: 200, width: 80, height: 30 }
    const { src, lift } = mouthSliceRect(mouth)
    expect(src.x).toBe(100)
    expect(src.width).toBe(80)
    // slice starts within the mouth band
    expect(src.y).toBeGreaterThanOrEqual(200)
    expect(lift).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/avatar/renderer.test.ts`
Expected: FAIL — cannot find module `./renderer.ts`.

- [ ] **Step 3: Write `src/avatar/renderer.ts`**

```ts
import type { FaceRegions, Region } from './landmarks.ts'
import type { Mood } from '../mood/sentiment.ts'

export interface Frame {
  mouthOpen: number // 0..1
  blink: number // 0..1
  swayX: number // px
  swayY: number // px
  tilt: number // radians
  mood: Mood
}

const MOOD_TINT: Record<Mood, string | null> = {
  neutral: null,
  happy: 'rgba(255, 210, 120, 0.10)',
  excited: 'rgba(255, 140, 90, 0.12)',
  sad: 'rgba(90, 130, 200, 0.12)',
}

// Pure helper: where to sample the lower-mouth slice and how far it can drop.
export function mouthSliceRect(mouth: Region): { src: Region; lift: number } {
  const src: Region = {
    x: mouth.x,
    y: mouth.y + mouth.height * 0.5,
    width: mouth.width,
    height: mouth.height * 0.5,
  }
  return { src, lift: mouth.height * 0.6 }
}

function drawEyelid(ctx: CanvasRenderingContext2D, img: CanvasImageSource, eye: Region, blink: number): void {
  if (blink <= 0) return
  // Copy a skin slice just above the eye and stretch it down over the eye.
  const drop = eye.height * blink
  ctx.drawImage(
    img,
    eye.x, eye.y - eye.height, eye.width, eye.height, // source: brow/skin above eye
    eye.x, eye.y - eye.height, eye.width, eye.height + drop, // dest: stretched down
  )
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  regions: FaceRegions,
  frame: Frame,
  size: { w: number; h: number },
): void {
  const { w, h } = size
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  // Sway + tilt around the center.
  ctx.translate(w / 2 + frame.swayX, h / 2 + frame.swayY)
  ctx.rotate(frame.tilt)
  ctx.translate(-w / 2, -h / 2)

  // Base portrait (cover-fit into the square).
  ctx.drawImage(img, 0, 0, w, h)

  // Mouth open: drop the lower-mouth slice and reveal a dark inner-mouth gap.
  if (frame.mouthOpen > 0) {
    const { src, lift } = mouthSliceRect(regions.mouth)
    const drop = lift * frame.mouthOpen
    ctx.fillStyle = 'rgba(40, 10, 15, 0.85)'
    ctx.fillRect(src.x, src.y, src.width, drop)
    ctx.drawImage(
      img,
      src.x, src.y, src.width, src.height,
      src.x, src.y + drop, src.width, src.height,
    )
  }

  // Blink.
  drawEyelid(ctx, img, regions.leftEye, frame.blink)
  drawEyelid(ctx, img, regions.rightEye, frame.blink)

  ctx.restore()

  // Mood tint as a full-canvas overlay (outside the transform).
  const tint = MOOD_TINT[frame.mood]
  if (tint) {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, w, h)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/avatar/renderer.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/avatar/renderer.ts src/avatar/renderer.test.ts
git commit -m "feat: canvas renderer (mouth-drop, blink, sway, mood tint)"
```

---

### Task 8: Avatar animator (state + frame loop)

**Files:**
- Create: `src/avatar/animator.ts`
- Test: `src/avatar/animator.test.ts`

**Interfaces:**
- Consumes: `Frame` from Task 7, `Mood` from Task 5.
- Produces:
  - `computeFrame(nowMs: number, state: AnimState): Frame` (pure) where
    `interface AnimState { speaking: boolean; mouthEnergy: number; lastBlinkMs: number; mood: Mood }`
  - `class Avatar` with: `constructor(canvas, img, regions)`, `start()`, `stop()`, `pulseMouth()`, `setSpeaking(on: boolean)`, `setMood(m: Mood)`

- [ ] **Step 1: Write the failing test** — `src/avatar/animator.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { computeFrame } from './animator.ts'

describe('computeFrame', () => {
  it('opens the mouth when there is energy and speaking', () => {
    const f = computeFrame(1000, { speaking: true, mouthEnergy: 1, lastBlinkMs: 1000, mood: 'neutral' })
    expect(f.mouthOpen).toBeGreaterThan(0.3)
  })
  it('keeps the mouth closed when not speaking', () => {
    const f = computeFrame(1000, { speaking: false, mouthEnergy: 1, lastBlinkMs: 1000, mood: 'neutral' })
    expect(f.mouthOpen).toBe(0)
  })
  it('passes mood through', () => {
    const f = computeFrame(1000, { speaking: false, mouthEnergy: 0, lastBlinkMs: 1000, mood: 'happy' })
    expect(f.mood).toBe('happy')
  })
  it('produces a blink pulse shortly after lastBlinkMs', () => {
    const f = computeFrame(1075, { speaking: false, mouthEnergy: 0, lastBlinkMs: 1000, mood: 'neutral' })
    expect(f.blink).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/avatar/animator.test.ts`
Expected: FAIL — cannot find module `./animator.ts`.

- [ ] **Step 3: Write `src/avatar/animator.ts`**

```ts
import type { FaceRegions } from './landmarks.ts'
import type { Mood } from '../mood/sentiment.ts'
import { drawFrame, type Frame } from './renderer.ts'

export interface AnimState {
  speaking: boolean
  mouthEnergy: number // 0..1, decays over time
  lastBlinkMs: number
  mood: Mood
}

const BLINK_DURATION = 150 // ms

export function computeFrame(nowMs: number, state: AnimState): Frame {
  // Idle sway/breathing.
  const swayX = Math.sin(nowMs / 1300) * 4
  const swayY = Math.sin(nowMs / 1700) * 3
  const tilt = Math.sin(nowMs / 2300) * 0.01

  // Blink: a short pulse beginning at lastBlinkMs.
  const sinceBlink = nowMs - state.lastBlinkMs
  let blink = 0
  if (sinceBlink >= 0 && sinceBlink <= BLINK_DURATION) {
    blink = Math.sin((sinceBlink / BLINK_DURATION) * Math.PI)
  }

  // Mouth: only when speaking, jittered by energy for a lively per-word pulse.
  let mouthOpen = 0
  if (state.speaking && state.mouthEnergy > 0) {
    const flutter = 0.7 + 0.3 * Math.sin(nowMs / 60)
    mouthOpen = Math.min(1, state.mouthEnergy * flutter)
  }

  return { mouthOpen, blink, swayX, swayY, tilt, mood: state.mood }
}

export class Avatar {
  private ctx: CanvasRenderingContext2D
  private size: { w: number; h: number }
  private state: AnimState
  private raf = 0

  constructor(
    private canvas: HTMLCanvasElement,
    private img: CanvasImageSource,
    private regions: FaceRegions,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.size = { w: canvas.width, h: canvas.height }
    this.state = { speaking: false, mouthEnergy: 0, lastBlinkMs: performance.now() + 2000, mood: 'neutral' }
  }

  start(): void {
    const loop = (now: number) => {
      // Decay mouth energy; schedule next blink after the current one finishes.
      this.state.mouthEnergy = Math.max(0, this.state.mouthEnergy - 0.04)
      if (now - this.state.lastBlinkMs > BLINK_DURATION + 2500 + Math.random() * 2500) {
        this.state.lastBlinkMs = now
      }
      const frame = computeFrame(now, this.state)
      drawFrame(this.ctx, this.img, this.regions, frame, this.size)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
  }

  pulseMouth(): void {
    this.state.mouthEnergy = 0.6 + Math.random() * 0.4
  }

  setSpeaking(on: boolean): void {
    this.state.speaking = on
    if (!on) this.state.mouthEnergy = 0
  }

  setMood(m: Mood): void {
    this.state.mood = m
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/avatar/animator.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/avatar/animator.ts src/avatar/animator.test.ts
git commit -m "feat: avatar animator (idle, blink, per-word mouth pulse)"
```

---

### Task 9: Integration — wire UI → chat → voice → avatar

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `sendChat`/`ChatMessage` (Task 3), `speak` (Task 4), `detectMood` (Task 5), `detectRegions` (Task 6), `Avatar` (Task 8).

- [ ] **Step 1: Replace `src/main.ts` with the full wiring**

```ts
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
```

- [ ] **Step 2: Manual end-to-end check**

Run `npm run server` and `npm run dev`. Open the page:
- Portrait loads and gently idles (blink + sway).
- Type a message → reply bubble appears AND the portrait speaks out loud with the mouth pulsing.
- First voice may require a click (browser autoplay) — clicking Send counts as the gesture, so it should speak on the first reply.

Expected: avatar talks back. If silent, check the browser supports `speechSynthesis` and a voice is installed.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass (Tasks 2–8).

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire chat, voice, mood, and animated avatar end to end"
```

---

## Self-Review

**Spec coverage:**
- Living portrait (idle blink/sway, speaking mouth, mood) → Tasks 6–8. ✓
- Browser TTS + word-boundary mouth drive → Tasks 4, 9. ✓
- Tiny backend + persona prompt, key server-side → Task 2. ✓
- Persona file → Task 1 (`persona.md`). ✓
- Data flow (type → /chat → speak → animate) → Task 9. ✓
- Error handling: backend fallback (Task 2), network fallback + autoplay note (Task 9), landmark fallback (Task 6). ✓
- Lip-sync limitation accepted (word-timed) → Tasks 4/8 by design. ✓
- Stack: Vite + vanilla TS + Express → Task 1. ✓
- Out-of-scope items (no voice input, no video, no DB) → not built. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code. ✓

**Type consistency:** `Region`/`FaceRegions` (Task 6) consumed unchanged in Tasks 7–8; `Frame` defined in Task 7, consumed in Task 8; `Mood` from Task 5 used in 7–9; `ChatMessage`/`sendChat` from Task 3 used in 9; `speak`/`SpeakHandlers` from Task 4 used in 9. ✓

**Note for implementers:** Tasks 4, 5, 6, 7, 8 are independent (no shared state between them) and may be built in parallel; Task 9 depends on all of 3–8; Task 3 depends on Task 1; Task 2 depends on Task 1.
