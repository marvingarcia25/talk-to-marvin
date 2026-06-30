# AI Clone — "Talk to Marvin" (Living Portrait)

**Date:** 2026-06-30
**Status:** Approved design, pre-implementation

## 1. Summary

A browser-based interactive AI clone of Marvin. The user types a message; an
animated living-portrait of Marvin's face replies **out loud** in his persona,
with mouth and expression reacting while it speaks. Runs locally, no GPU,
essentially free. Goal: a sharp, postable "I built my AI clone from scratch"
project that breaks the posting dry spell.

## 2. Experience

- Open the page → see Marvin's portrait, gently alive (blinking, slight sway).
- Type a message in a chat box, hit send.
- Backend asks Claude for a reply in Marvin's persona (a few seconds).
- Reply is spoken via the browser's TTS; the portrait's mouth animates in time
  with the words and the expression shifts subtly to match the mood.
- Reply text also shows in the chat log.

Input: **type only**. Output: **animated portrait + spoken voice + text**.

## 3. Architecture

Three decoupled parts, each independently understandable and testable.

### 3.1 The Face (frontend)

- A `<canvas>` rendered over Marvin's source photo.
- **One-time landmark detection** at load using a face-landmark library
  (MediaPipe Face Landmarker or face-api.js) to locate eyes and mouth regions
  in the photo. Cached so it runs once, not per frame.
- Three animation states, composited each frame:
  - **Idle:** periodic blink (eye region), gentle head sway + breathing
    (whole-image transform), always running.
  - **Speaking:** mouth region animates (open/close pulse) while TTS is active.
  - **Mood:** subtle tilt / color tint driven by reply sentiment.
- Interface: `avatar.speak(text, { onWord })`, `avatar.setMood(mood)`,
  `avatar.idle()`. No knowledge of the brain or network.

### 3.2 The Voice (browser TTS)

- Uses the browser's built-in `SpeechSynthesis` API (free, zero-setup).
- **Mouth drive:** the `SpeechSynthesisUtterance` `boundary` event fires per
  word; each event pulses the mouth. `start`/`end` toggle the speaking state.
- Known limitation (see §5): word-timed, not phoneme-accurate.

### 3.3 The Brain (tiny backend)

- A minimal Node/Express endpoint: `POST /chat { messages } -> { reply }`.
- Calls the Claude API (`claude-haiku-4-5` for fast, cheap replies) with a
  **persona system prompt** assembled from `persona.md`.
- Keeps the Claude API key server-side, off the client.
- Stateless beyond the conversation passed in the request; the frontend holds
  the running message history.

## 4. Data Flow

```
user types ─▶ frontend POST /chat (history)
                     │
                     ▼
            backend + persona.md ─▶ Claude API ─▶ reply text
                     │
                     ▼
   frontend: avatar.speak(reply) ─▶ SpeechSynthesis (audio)
                     │                      │
              boundary events ──────────────┘
                     ▼
            mouth pulses + mood shift; text appended to chat log
```

## 5. Known Limitation: Lip-Sync Fidelity

Volume-accurate lip-sync needs the raw audio waveform. The browser's built-in
`SpeechSynthesis` does not expose it. **v1 syncs the mouth to word-boundary
events** — convincing "talking," not phoneme-accurate.

Upgrade path (out of scope for v1, isolated change): swap browser TTS for a TTS
that returns an audio file, route it through a Web Audio `AnalyserNode`, and
drive the mouth from real amplitude. Only §3.2 changes.

## 6. Persona

- A `persona.md` file Marvin fills in: tone, speech style, a handful of facts
  and opinions. Injected verbatim as part of the system prompt.
- Keep it small — this is for "simple discussions," not a deep knowledge base.

## 7. Stack

- **Frontend:** Vite + vanilla TS, single page (avatar canvas + chat box).
- **Backend:** ~30-line Node/Express endpoint proxying Claude.
- **Config:** `.env` for `ANTHROPIC_API_KEY`; `persona.md` for personality.

## 8. Error Handling

- Backend Claude call fails → return a friendly fallback reply; avatar speaks
  "Sorry, my brain glitched — try again." Never crash the UI.
- TTS unavailable / blocked (browser autoplay policy) → show reply as text and
  run the speaking animation silently; surface a one-time "click to enable
  voice" prompt to satisfy autoplay gesture requirements.
- Landmark detection fails on the photo → fall back to a fixed mouth/eye region
  (manual coordinates) so the avatar still animates.

## 9. Testing

- **Face:** unit-test landmark-region math and animation-state transitions
  (idle ↔ speaking ↔ mood) with a fake clock; visual manual check.
- **Voice:** mock `SpeechSynthesis`; assert `boundary` events pulse the mouth
  and `start`/`end` toggle speaking state.
- **Brain:** unit-test persona-prompt assembly; integration-test `/chat` with a
  mocked Claude client (success + failure → fallback).

## 10. Out of Scope (v1)

No voice input, no photoreal video, no real-time streaming, no accounts or
database, no deploy pipeline, no phoneme-accurate lip-sync.

## 11. Success Criteria

Open the page, type a message, and Marvin's portrait talks back out loud with
mouth/expression reacting — reliably, locally, with no GPU. Good enough to
screen-record and post.
