import { computed, type Ref } from 'vue'
import type { Heartbeat } from '~/stores/monitors'

export function useMonitorStats(heartbeats: Ref<Heartbeat[]>) {
  const uptimePercent = computed(() => {
    const hbs = heartbeats.value
    if (!hbs || hbs.length === 0) return null
    const upCount = hbs.filter(h => h.status === 'up').length
    return Math.round((upCount / hbs.length) * 1000) / 10
  })

  const avgResponseTime = computed(() => {
    const hbs = heartbeats.value.filter(
      h => h.responseTimeMs !== null && h.responseTimeMs !== undefined
    )
    if (hbs.length === 0) return null
    const total = hbs.reduce((sum, h) => sum + (h.responseTimeMs ?? 0), 0)
    return Math.round(total / hbs.length)
  })

  const minResponseTime = computed(() => {
    const times = heartbeats.value
      .filter(h => h.responseTimeMs !== null && h.responseTimeMs !== undefined)
      .map(h => h.responseTimeMs as number)
    return times.length > 0 ? Math.min(...times) : null
  })

  const maxResponseTime = computed(() => {
    const times = heartbeats.value
      .filter(h => h.responseTimeMs !== null && h.responseTimeMs !== undefined)
      .map(h => h.responseTimeMs as number)
    return times.length > 0 ? Math.max(...times) : null
  })

  const downtime = computed(() => {
    return heartbeats.value.filter(h => h.status === 'down').length
  })

  const currentStatus = computed(() => {
    const hbs = heartbeats.value
    if (hbs.length === 0) return 'pending'
    return hbs[hbs.length - 1].status
  })

  return {
    uptimePercent,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    downtime,
    currentStatus
  }
}

export function calculateUptime(heartbeats: Heartbeat[], since?: Date): number | null {
  let hbs = heartbeats
  if (since) {
    hbs = heartbeats.filter(h => {
      if (!h.checkedAt) return false
      return new Date(h.checkedAt) >= since
    })
  }
  if (hbs.length === 0) return null
  const upCount = hbs.filter(h => h.status === 'up').length
  return Math.round((upCount / hbs.length) * 1000) / 10
}

export function formatResponseTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return 'N/A'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatUptime(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) return 'N/A'
  return `${percent}%`
}

export function getStatusColor(status: string | undefined): string {
  switch (status) {
    case 'up': return 'text-green-400'
    case 'down': return 'text-red-400'
    default: return 'text-yellow-400'
  }
}

export function getStatusBgColor(status: string | undefined): string {
  switch (status) {
    case 'up': return 'bg-green-500'
    case 'down': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}
