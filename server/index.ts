import express from 'express'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { createChatHandler, type MessageClient } from './chat.ts'

const here = dirname(fileURLToPath(import.meta.url))
// Load .env into process.env so ANTHROPIC_API_KEY is available (tsx doesn't auto-load it).
try {
  process.loadEnvFile(join(here, '..', '.env'))
} catch {
  // No .env file — rely on ambient environment variables.
}
const personaText = readFileSync(join(here, '..', 'persona.md'), 'utf8')
const client = new Anthropic() as unknown as MessageClient

const app = express()
app.use(express.json())
app.post('/api/chat', createChatHandler(client, personaText))
app.listen(8787, () => console.log('Marvin brain on http://localhost:8787'))
