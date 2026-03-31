<script setup lang="ts">
import { useMonitorsStore } from '~/stores/monitors'
import type { Monitor, Heartbeat } from '~/stores/monitors'
import { formatResponseTime, formatUptime } from '~/composables/useMonitorStats'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const store = useMonitorsStore()

const monitorId = computed(() => parseInt(route.params.id as string, 10))

interface MonitorDetail extends Monitor {
  incidents: Array<{
    id: number
    from: string
    to: string
    at: string
    message: string
  }>
}

interface HeartbeatStats {
  heartbeats: Heartbeat[]
  stats: {
    total: number
    upCount: number
    downCount: number
    uptimePercent: number | null
    avgResponseTime: number | null
    minResponseTime: number | null
    maxResponseTime: number | null
    period: string
  }
}

const monitor = ref<MonitorDetail | null>(null)
const heartbeatData = ref<HeartbeatStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedPeriod = ref<'24h' | '7d' | '30d'>('24h')
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)

async function fetchMonitorDetail() {
  try {
    const data = await $fetch<MonitorDetail>(`/api/monitors/${monitorId.value}`)
    monitor.value = data
  } catch (err: any) {
    error.value = err.message || 'Failed to load monitor'
  }
}

async function fetchHeartbeats() {
  try {
    const data = await $fetch<HeartbeatStats>(`/api/monitors/${monitorId.value}/heartbeats`, {
      query: { period: selectedPeriod.value, limit: 200 }
    })
    heartbeatData.value = data
  } catch (err: any) {
    console.error('Failed to load heartbeats:', err)
  }
}

async function loadAll() {
  loading.value = true
  error.value = null
  await Promise.all([fetchMonitorDetail(), fetchHeartbeats()])
  loading.value = false
}

watch(selectedPeriod, fetchHeartbeats)

onMounted(loadAll)

// Auto-refresh every 30s
const { pause } = useIntervalFn(loadAll, 30000)
onUnmounted(pause)

async function handleToggle() {
  if (!monitor.value) return
  try {
    const updated = await store.toggleMonitor(monitor.value.id)
    monitor.value = { ...monitor.value, ...updated }
  } catch (err) {
    console.error('Toggle failed:', err)
  }
}

async function confirmDelete() {
  if (!monitor.value) return
  try {
    await store.deleteMonitor(monitor.value.id)
    router.push('/')
  } catch (err) {
    console.error('Delete failed:', err)
  }
}

const currentStatus = computed(() => monitor.value?.latestHeartbeat?.status ?? 'pending')

function formatDate(ts: string | null | undefined): string {
  if (!ts) return 'N/A'
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Back button -->
    <div>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-4 animate-pulse">
      <div class="h-8 bg-card rounded w-1/3" />
      <div class="h-4 bg-card rounded w-1/2" />
      <div class="h-32 bg-card rounded" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
      {{ error }}
    </div>

    <template v-else-if="monitor">
      <!-- Monitor Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="pt-1">
            <StatusBadge :status="currentStatus" size="lg" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-foreground">{{ monitor.name }}</h1>
              <Badge
                :class="monitor.type === 'http' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'"
                variant="outline"
                class="font-mono uppercase text-xs"
              >
                {{ monitor.type }}
              </Badge>
              <Badge v-if="!monitor.enabled" variant="secondary">Paused</Badge>
            </div>
            <a
              :href="monitor.type === 'http' ? monitor.url : '#'"
              :target="monitor.type === 'http' ? '_blank' : undefined"
              :rel="monitor.type === 'http' ? 'noopener noreferrer' : undefined"
              class="text-sm text-muted-foreground hover:text-primary transition-colors font-mono mt-0.5 block"
            >{{ monitor.url }}</a>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button
            :variant="monitor.enabled ? 'outline' : 'outline'"
            :class="monitor.enabled ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'"
            class="gap-1.5"
            @click="handleToggle"
          >
            <svg v-if="monitor.enabled" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ monitor.enabled ? 'Pause' : 'Resume' }}
          </Button>
          <Button variant="outline" class="gap-1.5" @click="showEditModal = true">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button
            variant="outline"
            class="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            @click="showDeleteConfirm = true"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card class="p-3">
          <div class="text-xs text-muted-foreground mb-1">Response Time</div>
          <div class="text-lg font-bold text-foreground">
            {{ formatResponseTime(monitor.latestHeartbeat?.responseTimeMs) }}
          </div>
        </Card>
        <Card class="p-3">
          <div class="text-xs text-muted-foreground mb-1">Uptime 24h</div>
          <div
            class="text-lg font-bold"
            :class="monitor.uptime24h !== null ? (monitor.uptime24h >= 99 ? 'text-green-400' : monitor.uptime24h >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'"
          >{{ formatUptime(monitor.uptime24h) }}</div>
        </Card>
        <Card class="p-3">
          <div class="text-xs text-muted-foreground mb-1">Uptime 7d</div>
          <div
            class="text-lg font-bold"
            :class="monitor.uptime7d !== null ? (monitor.uptime7d >= 99 ? 'text-green-400' : monitor.uptime7d >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'"
          >{{ formatUptime(monitor.uptime7d) }}</div>
        </Card>
        <Card class="p-3">
          <div class="text-xs text-muted-foreground mb-1">Uptime 30d</div>
          <div
            class="text-lg font-bold"
            :class="monitor.uptime30d !== null ? (monitor.uptime30d >= 99 ? 'text-green-400' : monitor.uptime30d >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'"
          >{{ formatUptime(monitor.uptime30d) }}</div>
        </Card>
        <Card class="p-3">
          <div class="text-xs text-muted-foreground mb-1">Check Interval</div>
          <div class="text-lg font-bold text-foreground">{{ monitor.intervalSeconds }}s</div>
        </Card>
        <Card class="p-3">
          <div class="text-xs text-muted-foreground mb-1">Last Check</div>
          <div class="text-sm font-medium text-foreground">
            {{ monitor.latestHeartbeat?.checkedAt
              ? new Date(monitor.latestHeartbeat.checkedAt).toLocaleTimeString()
              : 'Never' }}
          </div>
        </Card>
      </div>

      <!-- Heartbeat Status Bar -->
      <Card class="p-4">
        <h2 class="text-sm font-semibold text-foreground mb-3">Recent Status (last 90 checks)</h2>
        <UptimeBar :heartbeats="monitor.recentHeartbeats" :blocks="90" />
      </Card>

      <!-- Response Time Chart -->
      <Card class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-foreground">Response Time</h2>
          <div class="flex gap-1">
            <Button
              v-for="period in ['24h', '7d', '30d']"
              :key="period"
              :variant="selectedPeriod === period ? 'default' : 'ghost'"
              size="sm"
              class="px-2.5 py-1 h-auto text-xs"
              @click="selectedPeriod = period as any"
            >{{ period }}</Button>
          </div>
        </div>

        <div v-if="heartbeatData" class="space-y-4">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div>
              <div class="text-xs text-muted-foreground">Avg</div>
              <div class="text-sm font-semibold text-foreground">
                {{ formatResponseTime(heartbeatData.stats.avgResponseTime) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Min</div>
              <div class="text-sm font-semibold text-green-400">
                {{ formatResponseTime(heartbeatData.stats.minResponseTime) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Max</div>
              <div class="text-sm font-semibold text-red-400">
                {{ formatResponseTime(heartbeatData.stats.maxResponseTime) }}
              </div>
            </div>
          </div>
          <ResponseTimeChart :heartbeats="heartbeatData.heartbeats" :height="150" />
        </div>
        <div v-else class="h-32 flex items-center justify-center text-muted-foreground text-sm">
          Loading chart...
        </div>
      </Card>

      <!-- Incident Log -->
      <Card class="p-4">
        <h2 class="text-sm font-semibold text-foreground mb-3">
          Incident Log
          <span class="text-muted-foreground font-normal ml-1">(last 20 status changes)</span>
        </h2>
        <div v-if="monitor.incidents && monitor.incidents.length > 0" class="space-y-2">
          <div
            v-for="incident in monitor.incidents"
            :key="incident.id"
            class="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
          >
            <div
              class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              :class="incident.to === 'down' ? 'bg-red-500' : 'bg-green-500'"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  :class="incident.to === 'down' ? 'text-red-400' : 'text-green-400'"
                  class="text-sm font-medium capitalize"
                >{{ incident.to === 'down' ? 'Service went down' : 'Service recovered' }}</span>
                <span class="text-xs text-muted-foreground">{{ formatDate(incident.at) }}</span>
              </div>
              <p v-if="incident.message" class="text-xs text-muted-foreground mt-0.5 truncate">
                {{ incident.message }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground py-4 text-center">
          No incidents recorded yet
        </div>
      </Card>

      <!-- Recent Heartbeats Table -->
      <Card class="overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <h2 class="text-sm font-semibold text-foreground">Recent Checks</h2>
          <span v-if="heartbeatData" class="text-xs text-muted-foreground">
            {{ heartbeatData.stats.upCount }} up, {{ heartbeatData.stats.downCount }} down in {{ selectedPeriod }}
          </span>
        </div>
        <div v-if="heartbeatData && heartbeatData.heartbeats.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left text-muted-foreground font-medium px-4 py-2">Status</th>
                <th class="text-left text-muted-foreground font-medium px-4 py-2">Response Time</th>
                <th class="text-left text-muted-foreground font-medium px-4 py-2">Checked At</th>
                <th class="text-left text-muted-foreground font-medium px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="hb in [...heartbeatData.heartbeats].reverse().slice(0, 50)"
                :key="hb.id"
                class="border-b border-border/30 hover:bg-accent/30 transition-colors"
              >
                <td class="px-4 py-2">
                  <StatusBadge :status="hb.status" size="sm" />
                </td>
                <td class="px-4 py-2 text-foreground">
                  {{ formatResponseTime(hb.responseTimeMs) }}
                </td>
                <td class="px-4 py-2 text-muted-foreground">
                  {{ formatDate(hb.checkedAt) }}
                </td>
                <td class="px-4 py-2 text-muted-foreground text-xs truncate max-w-xs">
                  {{ hb.message || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-8 text-center text-muted-foreground text-sm">
          No checks recorded in this time period
        </div>
      </Card>
    </template>

    <!-- Edit Modal -->
    <EditMonitorModal
      v-if="showEditModal && monitor"
      :monitor="monitor"
      @close="showEditModal = false"
      @updated="loadAll"
    />

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
      <template #title>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span>Delete Monitor</span>
        </div>
      </template>
      <p class="text-sm text-foreground mb-5">
        Are you sure you want to delete "{{ monitor?.name }}"? All heartbeat history will be permanently removed.
      </p>
      <div class="flex gap-3">
        <Button variant="outline" class="flex-1" @click="showDeleteConfirm = false">Cancel</Button>
        <Button variant="destructive" class="flex-1" @click="confirmDelete">Delete</Button>
      </div>
    </Dialog>
  </div>
</template>
