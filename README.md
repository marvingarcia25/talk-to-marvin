# Talk to Marvin

An interactive AI clone of me, in the browser. You type a message — and an
animated living-portrait of my face replies **out loud**, in my voice and
persona, with its mouth and expression reacting as it speaks.

No GPU. No video rendering. Runs locally. Essentially free.

## How it works

Instead of generating photorealistic talking-head video (one of the hardest
problems in the space, and not a weekend project), this animates a **single
photo on a canvas**:

- **Idle:** blink, gentle head sway, breathing.
- **Speaking:** the mouth pulses with each spoken word.
- **Mood:** a subtle tint shifts with the sentiment of the reply.

Three small, decoupled parts:

| Part | What it does |
| --- | --- |
| **The Face** (`src/avatar/`) | Detects eye/mouth regions once via MediaPipe (with a proportional fallback), then animates those regions on a `<canvas>`. |
| **The Voice** (`src/voice/`) | Speaks each reply with the browser's built-in `SpeechSynthesis`; word-boundary events drive the mouth. |
| **The Brain** (`server/`) | A tiny Express endpoint that calls the Claude API with a persona prompt and keeps the API key off the client. |

## Quick start

Requirements: Node 20.12+ (uses `process.loadEnvFile`), an
[Anthropic API key](https://console.anthropic.com/).

```bash
npm install

# add your key
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# make it sound like you — edit the persona
# (open persona.md and add your tone, facts, and opinions)

# run it (two terminals)
npm run server   # the brain — http://localhost:8787
npm run dev      # the app  — open the printed localhost URL
```

Type a message and the portrait talks back.

## Personalizing

- **`persona.md`** is the personality. It's injected as the system prompt — add
  a few real facts, opinions, and your speech style so replies sound like you.
- **`public/marvin.jpg`** is the face. Swap in your own photo (a clear,
  front-facing shot with visible eyes works best — see the caveats below).

## Honest caveats

- **Lip-sync is word-timed, not phoneme-accurate.** The browser's built-in TTS
  doesn't expose the raw audio waveform, so the mouth pulses per word rather
  than per phoneme. It reads as convincing "talking." Tighter sync is possible
  by swapping in a TTS that returns an audio file and analyzing its amplitude —
  an isolated change to the voice layer.
- **Sunglasses defeat the blink.** The source photo wears shades, so the
  blink animation (which works on the eye region) is invisible. A photo with
  visible eyes brings that part to life.

## Tech stack

Vite · TypeScript · Express · [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk)
(`claude-haiku-4-5`) · [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)
· browser `SpeechSynthesis` · Vitest

## Project layout

```
server/        Express + Claude proxy (persona prompt, key stays here)
src/
  chat/        frontend → /api/chat client
  voice/       SpeechSynthesis wrapper (word-boundary → mouth)
  mood/        keyword sentiment → mood
  avatar/      landmarks, canvas renderer, animation state machine
  main.ts      wires it all together
persona.md     the personality
public/         the face
docs/           design spec + implementation plan
```

## Testing

```bash
npm test         # Vitest — logic units: chat, voice, mood, landmarks, renderer, animator
npm run build    # tsc type-check + production bundle
```

## License

MIT
