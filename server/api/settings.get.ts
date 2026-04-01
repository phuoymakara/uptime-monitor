import { readSettings } from '../utils/settings'

export default defineEventHandler(() => {
  return readSettings()
})
