import { writeSettings } from '../utils/settings'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    defaultIntervalSeconds?: number
    webhookUrl?: string
    webhookType?: 'discord' | 'slack' | 'generic'
  }>(event)

  return writeSettings(body)
})
