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
