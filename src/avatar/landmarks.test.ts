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
