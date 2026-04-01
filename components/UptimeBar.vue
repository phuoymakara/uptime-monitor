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

  // Find max response time across all bars for proportional height scaling
  const maxRt = hbs.reduce((max, hb) => {
    return hb?.responseTimeMs !== null && hb.responseTimeMs! > max ? hb.responseTimeMs! : max
  }, 0)

  // Pad the front with empty blocks if fewer than total
  const padCount = total - hbs.length
  const padded = [
    ...Array(padCount).fill(null),
    ...hbs
  ]

  return padded.map((hb, index) => {
    const rt = hb?.responseTimeMs ?? null
    let heightPct = 30 // empty/no-data baseline

    if (hb !== null) {
      if (hb.status === 'down') {
        heightPct = 100 // down is always full height
      } else if (rt !== null && maxRt > 0) {
        // Scale between 30% and 100% proportionally to response time
        // Faster = shorter bar (less visual weight), slower = taller bar
        heightPct = 30 + Math.round((rt / maxRt) * 70)
      } else {
        heightPct = 50
      }
    }

    return {
      index,
      status: hb?.status ?? null,
      responseTimeMs: rt,
      checkedAt: hb?.checkedAt ?? null,
      message: hb?.message ?? null,
      heightPct,
    }
  })
})

function blockColor(status: string | null): string {
  switch (status) {
    case 'up': return 'bg-green-500 hover:bg-green-400'
    case 'down': return 'bg-red-500 hover:bg-red-400'
    default: return 'bg-gray-700/60 hover:bg-gray-600/60'
  }
}

function formatTime(ts: string | null): string {
  if (!ts) return 'No data'
  return new Date(ts).toLocaleString()
}

function tooltipText(bar: typeof bars.value[0]): string {
  if (!bar.status) return 'No data'
  const status = bar.status.toUpperCase()
  const time = formatTime(bar.checkedAt)
  const rt = bar.responseTimeMs !== null ? ` — ${bar.responseTimeMs}ms` : ''
  const msg = bar.message ? ` — ${bar.message}` : ''
  return `${status} · ${time}${rt}${msg}`
}
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-end gap-[2px]" style="height: 36px;">
      <div
        v-for="bar in bars"
        :key="bar.index"
        :class="['flex-1 rounded-[2px] transition-all duration-150 cursor-default', blockColor(bar.status)]"
        :style="`min-width: 2px; height: ${bar.heightPct}%;`"
        :title="tooltipText(bar)"
      />
    </div>
    <div class="flex justify-between text-[10px] text-muted-foreground/60">
      <span>{{ blocks }} checks ago</span>
      <span>Now</span>
    </div>
  </div>
</template>
