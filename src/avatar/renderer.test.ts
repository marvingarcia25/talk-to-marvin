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
