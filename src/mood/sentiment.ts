export type Mood = 'neutral' | 'happy' | 'sad' | 'excited'

const EXCITED = ['wow', 'amazing', 'incredible', "let's go", 'awesome']
const HAPPY = ['glad', 'great', 'love', 'nice', 'haha', 'happy', 'wonderful', 'thanks']
const SAD = ['sorry', 'sad', 'unfortunately', 'bad', 'worried', 'afraid']

function count(text: string, words: string[]): number {
  return words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0)
}

export function detectMood(text: string): Mood {
  const t = text.toLowerCase()
  const exclaims = (t.match(/!/g) ?? []).length
  if (count(t, EXCITED) > 0 || exclaims >= 2) return 'excited'
  if (count(t, SAD) > count(t, HAPPY)) return 'sad'
  if (count(t, HAPPY) > 0) return 'happy'
  return 'neutral'
}
