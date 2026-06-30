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
