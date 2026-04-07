import { unlinkSync, existsSync } from 'fs'
import { resolve, basename } from 'path'

const backupDir = resolve(process.env.DATA_DIR || 'data', 'backups')

export default defineEventHandler((event) => {
  const raw = getRouterParam(event, 'filename') || ''

  // Safety: only allow filenames matching the expected pattern, no path traversal
  const filename = basename(raw)
  if (!/^sqlite-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.db$/.test(filename)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid backup filename' })
  }

  const filePath = resolve(backupDir, filename)

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Backup not found' })
  }

  try {
    unlinkSync(filePath)
    return { success: true, filename }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Delete failed: ${err.message}` })
  }
})
