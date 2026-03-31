<script setup lang="ts">
import type { Monitor } from '~/stores/monitors'
import { formatResponseTime, formatUptime } from '~/composables/useMonitorStats'
import { useMonitorsStore } from '~/stores/monitors'

interface Props {
  monitor: Monitor
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: [monitor: Monitor]
  delete: [id: number]
}>()

const store = useMonitorsStore()
const router = useRouter()

const currentStatus = computed(() => props.monitor.latestHeartbeat?.status ?? 'pending')

async function handleToggle() {
  try {
    await store.toggleMonitor(props.monitor.id)
  } catch (err) {
    console.error('Failed to toggle monitor:', err)
  }
}

function navigateToDetail() {
  router.push(`/monitor/${props.monitor.id}`)
}

const statusBorderColor = computed(() => {
  switch (currentStatus.value) {
    case 'up': return 'border-l-green-500'
    case 'down': return 'border-l-red-500'
    default: return 'border-l-yellow-500'
  }
})
</script>

<template>
  <Card
    :class="[
      'border-l-4 p-4 hover:border-border/80 transition-all cursor-pointer group',
      statusBorderColor
    ]"
    @click="navigateToDetail"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0 flex-1">
        <div class="pt-0.5">
          <StatusBadge :status="currentStatus" :show-label="false" size="lg" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-foreground truncate text-base">{{ monitor.name }}</h3>
            <Badge
              :class="monitor.type === 'http' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'"
              variant="outline"
              class="font-mono uppercase text-xs flex-shrink-0"
            >
              {{ monitor.type }}
            </Badge>
            <Badge v-if="!monitor.enabled" variant="secondary" class="flex-shrink-0">
              Paused
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground truncate mt-0.5">{{ monitor.url }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
        <Button
          variant="ghost"
          size="icon"
          :title="monitor.enabled ? 'Pause monitor' : 'Resume monitor'"
          class="h-8 w-8"
          @click="handleToggle"
        >
          <svg v-if="monitor.enabled" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Edit monitor"
          class="h-8 w-8"
          @click="emit('edit', monitor)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Delete monitor"
          class="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
          @click="emit('delete', monitor.id)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>

    <div class="mt-3">
      <UptimeBar :heartbeats="monitor.recentHeartbeats" :blocks="90" />
    </div>

    <div class="flex items-center gap-4 mt-3 text-sm">
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground">Response:</span>
        <span class="text-foreground font-medium">
          {{ formatResponseTime(monitor.latestHeartbeat?.responseTimeMs) }}
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground">24h:</span>
        <span
          class="font-medium"
          :class="monitor.uptime24h !== null ? (monitor.uptime24h >= 99 ? 'text-green-400' : monitor.uptime24h >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'"
        >{{ formatUptime(monitor.uptime24h) }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground">7d:</span>
        <span
          class="font-medium"
          :class="monitor.uptime7d !== null ? (monitor.uptime7d >= 99 ? 'text-green-400' : monitor.uptime7d >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'"
        >{{ formatUptime(monitor.uptime7d) }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground">30d:</span>
        <span
          class="font-medium"
          :class="monitor.uptime30d !== null ? (monitor.uptime30d >= 99 ? 'text-green-400' : monitor.uptime30d >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'"
        >{{ formatUptime(monitor.uptime30d) }}</span>
      </div>
      <div class="flex items-center gap-1.5 ml-auto">
        <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-muted-foreground text-xs">Every {{ monitor.intervalSeconds }}s</span>
      </div>
    </div>
  </Card>
</template>
