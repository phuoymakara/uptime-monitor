<script setup lang="ts">
import { useMonitorsStore } from '~/stores/monitors'
import type { Monitor } from '~/stores/monitors'

definePageMeta({ layout: 'default' })

const store = useMonitorsStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editingMonitor = ref<Monitor | null>(null)
const deletingId = ref<number | null>(null)
const searchQuery = ref('')
const filterStatus = ref<'all' | 'up' | 'down' | 'pending'>('all')

// Auto-refresh every 30 seconds
const { pause, resume } = useIntervalFn(async () => {
  await store.fetchMonitors()
}, 30000)

onMounted(async () => {
  await store.fetchMonitors()
})

onUnmounted(() => {
  pause()
})

const filteredMonitors = computed(() => {
  let monitors = store.monitors
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    monitors = monitors.filter(m =>
      m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q)
    )
  }
  if (filterStatus.value !== 'all') {
    monitors = monitors.filter(m => {
      const status = m.latestHeartbeat?.status ?? 'pending'
      return status === filterStatus.value
    })
  }
  return monitors
})

function handleEdit(monitor: Monitor) {
  editingMonitor.value = monitor
  showEditModal.value = true
}

function handleDeleteClick(id: number) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (deletingId.value === null) return
  try {
    await store.deleteMonitor(deletingId.value)
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    showDeleteConfirm.value = false
    deletingId.value = null
  }
}

async function handleRefresh() {
  await store.fetchMonitors()
}

const overallStatus = computed(() => {
  if (store.totalMonitors === 0) return 'none'
  if (store.downMonitors > 0) return 'degraded'
  if (store.pendingMonitors === store.totalMonitors) return 'pending'
  return 'operational'
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Monitor the uptime and performance of your services
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          class="gap-2"
          :disabled="store.loading"
          @click="handleRefresh"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': store.loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
        <Button class="gap-2" @click="showAddModal = true">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Monitor
        </Button>
      </div>
    </div>

    <!-- Overall Status Banner -->
    <div
      v-if="store.totalMonitors > 0"
      :class="[
        'flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium',
        overallStatus === 'operational'
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : overallStatus === 'degraded'
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      ]"
    >
      <span
        class="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse-dot"
        :class="{
          'bg-green-500': overallStatus === 'operational',
          'bg-red-500': overallStatus === 'degraded',
          'bg-yellow-500': overallStatus === 'pending'
        }"
      />
      <span v-if="overallStatus === 'operational'">All systems operational</span>
      <span v-else-if="overallStatus === 'degraded'">
        {{ store.downMonitors }} service{{ store.downMonitors !== 1 ? 's' : '' }} down
      </span>
      <span v-else>Checking services...</span>

      <span class="ml-auto text-xs opacity-70">
        {{ store.upMonitors }}/{{ store.totalMonitors }} up
      </span>
    </div>

    <!-- Stats Cards -->
    <div v-if="store.totalMonitors > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card class="p-4">
        <div class="text-2xl font-bold text-foreground">{{ store.totalMonitors }}</div>
        <div class="text-sm text-muted-foreground mt-0.5">Total Monitors</div>
      </Card>
      <Card class="p-4">
        <div class="text-2xl font-bold text-green-400">{{ store.upMonitors }}</div>
        <div class="text-sm text-muted-foreground mt-0.5">Online</div>
      </Card>
      <Card class="p-4">
        <div class="text-2xl font-bold text-red-400">{{ store.downMonitors }}</div>
        <div class="text-sm text-muted-foreground mt-0.5">Offline</div>
      </Card>
      <Card class="p-4">
        <div class="text-2xl font-bold text-yellow-400">{{ store.pendingMonitors }}</div>
        <div class="text-sm text-muted-foreground mt-0.5">Pending</div>
      </Card>
    </div>

    <!-- Search & Filter -->
    <div v-if="store.totalMonitors > 0" class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input
          v-model="searchQuery"
          placeholder="Search monitors..."
          class="pl-9"
        />
      </div>
      <div class="flex gap-1.5">
        <Button
          v-for="status in ['all', 'up', 'down', 'pending']"
          :key="status"
          :variant="filterStatus === status ? 'default' : 'outline'"
          size="sm"
          class="capitalize"
          @click="filterStatus = status as any"
        >
          {{ status === 'all' ? `All (${store.totalMonitors})` : status }}
        </Button>
      </div>
    </div>

    <!-- Monitor List -->
    <div v-if="store.loading && store.monitors.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-muted rounded w-1/4" />
            <div class="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
        <div class="mt-3 h-8 bg-muted rounded" />
      </div>
    </div>

    <div v-else-if="store.error" class="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
      {{ store.error }}
    </div>

    <div v-else-if="store.totalMonitors === 0" class="text-center py-16">
      <div class="w-16 h-16 bg-card border border-border rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-foreground mb-1">No monitors yet</h3>
      <p class="text-muted-foreground text-sm mb-4">
        Start monitoring your services by adding your first monitor.
      </p>
      <Button class="gap-2" @click="showAddModal = true">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Your First Monitor
      </Button>
    </div>

    <div v-else-if="filteredMonitors.length === 0" class="text-center py-10 text-muted-foreground">
      No monitors match your search criteria
    </div>

    <div v-else class="space-y-3">
      <MonitorCard
        v-for="monitor in filteredMonitors"
        :key="monitor.id"
        :monitor="monitor"
        @edit="handleEdit"
        @delete="handleDeleteClick"
      />
    </div>

    <!-- Add Monitor Modal -->
    <AddMonitorModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @created="store.fetchMonitors()"
    />

    <!-- Edit Monitor Modal -->
    <EditMonitorModal
      v-if="showEditModal && editingMonitor"
      :monitor="editingMonitor"
      @close="showEditModal = false; editingMonitor = null"
      @updated="store.fetchMonitors()"
    />

    <!-- Delete Confirmation Dialog -->
    <Dialog
      :open="showDeleteConfirm"
      @update:open="showDeleteConfirm = $event"
    >
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
        Are you sure you want to delete this monitor? All heartbeat history will be permanently removed.
      </p>
      <div class="flex gap-3">
        <Button variant="outline" class="flex-1" @click="showDeleteConfirm = false">
          Cancel
        </Button>
        <Button variant="destructive" class="flex-1" @click="confirmDelete">
          Delete
        </Button>
      </div>
    </Dialog>
  </div>
</template>
