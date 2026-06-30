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
    canvas: HTMLCanvasElement,
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
