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
