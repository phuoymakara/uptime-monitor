import { copyFileSync, mkdirSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'

const dataDir = process.env.DATA_DIR || 'data'
const src = resolve(dataDir, 'sqlite.db')
const backupDir = resolve(dataDir, 'backups')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default defineEventHandler(() => {
  if (!existsSync(src)) {
    throw createError({ statusCode: 404, statusMessage: 'Database file not found' })
  }

  mkdirSync(backupDir, { recursive: true })

  const now = new Date()
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const filename = `sqlite-${ts}.db`
  const dest = resolve(backupDir, filename)

  try {
    copyFileSync(src, dest)
    const stats = statSync(dest)
    return {
      filename,
      sizeBytes: stats.size,
      createdAt: stats.birthtime.toISOString(),
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Backup failed: ${err.message}` })
  }
})
