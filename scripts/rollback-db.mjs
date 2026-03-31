import { copyFileSync, mkdirSync, existsSync, readdirSync, renameSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const dbPath = resolve(root, 'data/sqlite.db')
const backupDir = resolve(root, 'data/backups')

// Get specific backup filename from CLI args
const targetFilename = process.argv[2]

if (!existsSync(backupDir)) {
  console.error('[Rollback] No backups directory found at data/backups/')
  process.exit(1)
}

const backups = readdirSync(backupDir)
  .filter(f => f.startsWith('sqlite-') && f.endsWith('.db'))
  .sort()

if (backups.length === 0) {
  console.error('[Rollback] No backup files found in data/backups/')
  console.error('[Rollback] Run "yarn db:backup" first to create a backup.')
  process.exit(1)
}

let selectedBackup

if (targetFilename) {
  // User specified a backup file
  const found = backups.find(b => b === targetFilename || b === `sqlite-${targetFilename}.db`)
  if (!found) {
    console.error(`[Rollback] Backup "${targetFilename}" not found.`)
    console.log('[Rollback] Available backups:')
    backups.forEach((b, i) => {
      const stats = statSync(resolve(backupDir, b))
      const sizeKB = Math.round(stats.size / 1024)
      const age = Math.round((Date.now() - stats.mtime.getTime()) / 1000 / 60)
      console.log(`  ${i + 1}. ${b} (${sizeKB} KB, ${age}m ago)`)
    })
    process.exit(1)
  }
  selectedBackup = found
} else {
  // Default to most recent backup
  selectedBackup = backups[backups.length - 1]
  console.log('[Rollback] No specific backup specified — using most recent.')
}

const srcPath = resolve(backupDir, selectedBackup)
const srcStats = statSync(srcPath)
const srcSizeKB = Math.round(srcStats.size / 1024)
const srcAge = Math.round((Date.now() - srcStats.mtime.getTime()) / 1000 / 60)

console.log(`[Rollback] Selected backup: ${selectedBackup}`)
console.log(`[Rollback] Backup size: ${srcSizeKB} KB, created ${srcAge} minute(s) ago`)

// Safety: backup the current DB before overwriting
if (existsSync(dbPath)) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const safetyBackup = resolve(backupDir, `pre-rollback-${ts}.db`)

  try {
    copyFileSync(dbPath, safetyBackup)
    console.log(`[Rollback] Safety backup of current DB saved to: ${safetyBackup}`)
  } catch (err) {
    console.error('[Rollback] Could not create safety backup:', err.message)
    console.error('[Rollback] Aborting rollback for safety.')
    process.exit(1)
  }
}

// Perform the rollback
try {
  copyFileSync(srcPath, dbPath)
  console.log(`[Rollback] Successfully restored database from backup.`)
  console.log(`[Rollback] Restore complete: ${srcPath} -> ${dbPath}`)
  console.log('[Rollback] Restart the server to apply the rollback.')
} catch (err) {
  console.error('[Rollback] Failed to restore database:', err.message)
  process.exit(1)
}

// Show all available backups for reference
console.log('\n[Rollback] All available backups:')
backups.forEach((b, i) => {
  const marker = b === selectedBackup ? ' <-- RESTORED' : ''
  const stats = statSync(resolve(backupDir, b))
  const sizeKB = Math.round(stats.size / 1024)
  console.log(`  ${i + 1}. ${b} (${sizeKB} KB)${marker}`)
})
