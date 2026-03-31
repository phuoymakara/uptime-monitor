<script setup lang="ts">
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-vue-next'
import { useMonitorsStore } from '~/stores/monitors'
import type { Monitor } from '~/stores/monitors'

definePageMeta({ layout: 'default' })

const store = useMonitorsStore()

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const editingMonitor = ref<Monitor | null>(null)
const deletingId = ref<number | null>(null)
const searchQuery = ref('')
const filterStatus = ref<'all' | 'up' | 'down' | 'pending'>('all')

const { pause } = useIntervalFn(() => store.fetchMonitors(), 30000)
onMounted(() => store.fetchMonitors())
onUnmounted(pause)

const filteredMonitors = computed(() => {
  let list = store.monitors
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m => m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q))
  }
  if (filterStatus.value !== 'all') {
    list = list.filter(m => (m.latestHeartbeat?.status ?? 'pending') === filterStatus.value)
  }
  return list
})

function handleEdit(monitor: Monitor) {
  editingMonitor.value = monitor
  showForm.value = true
}

function handleDelete(id: number) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deletingId.value) return
  try {
    await store.deleteMonitor(deletingId.value)
  } finally {
    showDeleteConfirm.value = false
    deletingId.value = null
  }
}

function openAdd() {
  editingMonitor.value = null
  showForm.value = true
}

const overallStatus = computed(() => {
  if (!store.totalMonitors) return 'none'
  if (store.downMonitors > 0) return 'degraded'
  if (store.pendingMonitors === store.totalMonitors) return 'pending'
  return 'operational'
})

const STATUS_FILTERS = ['all', 'up', 'down', 'pending'] as const
</script>

<template>
  <div class="p-6 space-y-6 max-w-5xl mx-auto">

    <!-- Page header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground">Monitor the uptime of your services</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="gap-1.5" :disabled="store.loading" @click="store.fetchMonitors()">
          <RefreshCw :class="['size-3.5', store.loading && 'animate-spin']" />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
        <Button size="sm" class="gap-1.5" @click="openAdd">
          <Plus class="size-3.5" />
          Add Monitor
        </Button>
      </div>
    </div>

    <!-- Overall status banner -->
    <div
      v-if="store.totalMonitors > 0"
      :class="[
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium',
        overallStatus === 'operational' ? 'bg-green-500/10 border-green-500/20 text-green-400'
        : overallStatus === 'degraded' ? 'bg-red-500/10 border-red-500/20 text-red-400'
        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      ]"
    >
      <CheckCircle2 v-if="overallStatus === 'operational'" class="size-4 shrink-0" />
      <XCircle v-else-if="overallStatus === 'degraded'" class="size-4 shrink-0" />
      <AlertCircle v-else class="size-4 shrink-0" />

      <span v-if="overallStatus === 'operational'">All systems operational</span>
      <span v-else-if="overallStatus === 'degraded'">
        {{ store.downMonitors }} service{{ store.downMonitors !== 1 ? 's' : '' }} currently down
      </span>
      <span v-else>Checking services…</span>

      <span class="ml-auto text-xs opacity-60 font-normal tabular-nums">
        {{ store.upMonitors }} / {{ store.totalMonitors }} up
      </span>
    </div>

    <!-- Stats cards -->
    <div v-if="store.totalMonitors > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card class="p-4">
        <div class="text-2xl font-bold text-foreground">{{ store.totalMonitors }}</div>
        <div class="text-xs text-muted-foreground mt-1">Total</div>
      </Card>
      <Card class="p-4">
        <div class="flex items-center gap-1.5">
          <div class="text-2xl font-bold text-green-400">{{ store.upMonitors }}</div>
          <BarChart2 class="size-4 text-green-400/50 ml-auto" />
        </div>
        <div class="text-xs text-muted-foreground mt-1">Online</div>
      </Card>
      <Card class="p-4">
        <div class="text-2xl font-bold text-red-400">{{ store.downMonitors }}</div>
        <div class="text-xs text-muted-foreground mt-1">Offline</div>
      </Card>
      <Card class="p-4">
        <div class="text-2xl font-bold text-yellow-400">{{ store.pendingMonitors }}</div>
        <div class="text-xs text-muted-foreground mt-1">Pending</div>
      </Card>
    </div>

    <!-- Search + filter -->
    <div v-if="store.totalMonitors > 0" class="flex flex-col sm:flex-row gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="searchQuery" placeholder="Search by name or URL…" class="pl-9" />
      </div>
      <div class="flex gap-1">
        <Button
          v-for="s in STATUS_FILTERS"
          :key="s"
          :variant="filterStatus === s ? 'default' : 'outline'"
          size="sm"
          class="capitalize text-xs"
          @click="filterStatus = s"
        >
          {{ s === 'all' ? `All (${store.totalMonitors})` : s }}
        </Button>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="store.loading && !store.monitors.length" class="space-y-3">
      <div v-for="i in 3" :key="i" class="rounded-lg border border-border p-4 space-y-3">
        <div class="flex items-center gap-3">
          <Skeleton class="size-3 rounded-full" />
          <Skeleton class="h-4 w-1/3" />
        </div>
        <Skeleton class="h-8 w-full rounded" />
        <div class="flex gap-4">
          <Skeleton class="h-3 w-20" />
          <Skeleton class="h-3 w-16" />
          <Skeleton class="h-3 w-16" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      <AlertCircle class="size-4 shrink-0" />
      {{ store.error }}
    </div>

    <!-- Empty state: no monitors at all -->
    <div v-else-if="!store.totalMonitors" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-5 flex size-16 items-center justify-center rounded-2xl bg-card border border-border">
        <BarChart2 class="size-7 text-muted-foreground" />
      </div>
      <h2 class="text-base font-semibold text-foreground">No monitors yet</h2>
      <p class="mt-1 text-sm text-muted-foreground max-w-xs">
        Add your first monitor to start tracking uptime and response times.
      </p>
      <Button class="mt-5 gap-2" @click="openAdd">
        <Plus class="size-4" />
        Add your first monitor
      </Button>
    </div>

    <!-- Empty search result -->
    <div v-else-if="!filteredMonitors.length" class="flex flex-col items-center py-12 text-sm text-muted-foreground gap-2">
      <Search class="size-6 opacity-40" />
      No monitors match your search
    </div>

    <!-- Monitor list -->
    <div v-else class="space-y-2.5">
      <MonitorCard
        v-for="monitor in filteredMonitors"
        :key="monitor.id"
        :monitor="monitor"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- Add / Edit form modal -->
    <MonitorFormModal
      :open="showForm"
      :monitor="editingMonitor"
      @update:open="val => { showForm = val; if (!val) editingMonitor = null }"
      @saved="store.fetchMonitors()"
    />

    <!-- Delete confirmation -->
    <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
      <template #title>
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-full bg-destructive/15 shrink-0">
            <AlertCircle class="size-4 text-destructive" />
          </div>
          <span>Delete Monitor</span>
        </div>
      </template>
      <p class="text-sm text-muted-foreground mb-5">
        This will permanently delete the monitor and all its heartbeat history. This action cannot be undone.
      </p>
      <div class="flex gap-3">
        <Button variant="outline" class="flex-1" @click="showDeleteConfirm = false">Cancel</Button>
        <Button variant="destructive" class="flex-1" @click="confirmDelete">Delete</Button>
      </div>
    </Dialog>
  </div>
</template>
