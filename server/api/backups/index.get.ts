import { readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const backupDir = resolve(process.env.DATA_DIR || 'data', 'backups')

export default defineEventHandler(() => {
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
    return { backups: [] }
  }

  const files = readdirSync(backupDir)
    .filter(f => f.startsWith('sqlite-') && f.endsWith('.db'))
    .sort()
    .reverse()
    .map(filename => {
      const stats = statSync(resolve(backupDir, filename))
      return {
        filename,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
      }
    })

  return { backups: files }
})
