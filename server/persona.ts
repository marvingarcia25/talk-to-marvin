export function buildSystemPrompt(personaText: string): string {
  return [
    'You are role-playing as a real person in a short spoken chat.',
    'Stay in character. Replies are read aloud, so keep them to 1–3 short sentences.',
    '',
    '--- PERSONA ---',
    personaText.trim(),
  ].join('\n')
}
