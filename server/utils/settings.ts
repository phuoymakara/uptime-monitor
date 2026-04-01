import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface AppSettings {
  defaultIntervalSeconds: number
  webhookType: 'discord' | 'slack' | 'telegram' | 'generic'
  // Discord / Slack / Generic
  webhookUrl: string
  // Telegram
  telegramBotToken: string
  telegramChatId: string
}

const SETTINGS_FILE = join(process.cwd(), 'data', 'settings.json')

const defaults: AppSettings = {
  defaultIntervalSeconds: 60,
  webhookType: 'discord',
  webhookUrl: '',
  telegramBotToken: '',
  telegramChatId: '',
}

export function readSettings(): AppSettings {
  try {
    if (!existsSync(SETTINGS_FILE)) return { ...defaults }
    return { ...defaults, ...JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8')) }
  } catch {
    return { ...defaults }
  }
}

export function writeSettings(settings: Partial<AppSettings>): AppSettings {
  const current = readSettings()
  const next = { ...current, ...settings }
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2))
  return next
}
