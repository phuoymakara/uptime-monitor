import type { Config } from 'drizzle-kit'
import { resolve } from 'path'

export default {
  schema: './server/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolve(process.cwd(), 'data/sqlite.db')
  },
  verbose: true,
  strict: true
} satisfies Config
