<script setup lang="ts">
import type { Heartbeat } from '~/stores/monitors'

interface Props {
  heartbeats: Heartbeat[]
  blocks?: number
}

const props = withDefaults(defineProps<Props>(), {
  blocks: 90
})

const bars = computed(() => {
  const total = props.blocks
  const hbs = [...props.heartbeats].slice(-total)

  // Pad the front with empty blocks if fewer than total
  const padCount = total - hbs.length
  const padded = [
    ...Array(padCount).fill(null),
    ...hbs
  ]

  return padded.map((hb, index) => ({
    index,
    status: hb?.status ?? null,
    responseTimeMs: hb?.responseTimeMs ?? null,
    checkedAt: hb?.checkedAt ?? null,
    message: hb?.message ?? null
  }))
})

function blockColor(status: string | null): string {
  switch (status) {
    case 'up': return 'bg-green-500 hover:bg-green-400'
    case 'down': return 'bg-red-500 hover:bg-red-400'
    default: return 'bg-gray-700 hover:bg-gray-600'
  }
}

function formatTime(ts: string | null): string {
  if (!ts) return 'No data'
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-end gap-0.5" style="height: 32px;">
      <div
        v-for="bar in bars"
        :key="bar.index"
        :class="['flex-1 rounded-sm transition-colors cursor-default', blockColor(bar.status)]"
        style="min-width: 2px; height: 100%;"
        :title="bar.status
          ? `${bar.status.toUpperCase()} - ${formatTime(bar.checkedAt)}${bar.responseTimeMs !== null ? ` - ${bar.responseTimeMs}ms` : ''}${bar.message ? ` - ${bar.message}` : ''}`
          : 'No data'"
      />
    </div>
    <div class="flex justify-between text-xs text-muted-foreground">
      <span>{{ blocks }} checks ago</span>
      <span>Now</span>
    </div>
  </div>
</template>
