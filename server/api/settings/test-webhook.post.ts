import { readSettings } from '../../utils/settings'
import { sendNotification } from '../../utils/notify'

export default defineEventHandler(async () => {
  const settings = readSettings()

  const hasConfig = settings.webhookType === 'telegram'
    ? (settings.telegramBotToken && settings.telegramChatId)
    : settings.webhookUrl

  if (!hasConfig) {
    throw createError({ statusCode: 400, message: 'Notification is not configured' })
  }

  await sendNotification(
    settings,
    { name: 'Test Monitor', url: 'https://example.com' },
    'down',
    'This is a test notification from Uptime Monitor'
  )

  return { ok: true }
})
