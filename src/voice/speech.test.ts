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
