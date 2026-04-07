<script setup lang="ts">
import { CheckCircle2, Database, FileText, HardDrive, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Backups',
  description: 'Create, view, and manage database backups. Download a human-readable report of your monitoring data.',
  ogTitle: 'Backups · Uptime Monitor',
  ogDescription: 'Create, view, and manage database backups. Download a human-readable report of your monitoring data.',
  robots: 'noindex, nofollow',
})

interface Backup {
  filename: string
  sizeBytes: number
  createdAt: string
}

const backups = ref<Backup[]>([])
const loading = ref(true)
const creating = ref(false)
const deletingFile = ref<string | null>(null)
const toast = ref<{ ok: boolean; message: string } | null>(null)
const confirmDelete = ref<string | null>(null)

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

// Extract timestamp from filename for display
function labelFromFilename(filename: string) {
  // sqlite-2024-01-15_14-30-00.db → 2024-01-15 14:30:00
  const match = filename.match(/sqlite-(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.db/)
  if (!match) return filename
  return `${match[1]} ${match[2]}:${match[3]}:${match[4]}`
}

function showToast(ok: boolean, message: string) {
  toast.value = { ok, message }
  setTimeout(() => { toast.value = null }, 4000)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ backups: Backup[] }>('/api/backups')
    backups.value = data.backups
  } catch {
    showToast(false, 'Failed to load backups.')
  } finally {
    loading.value = false
  }
}

async function createBackup() {
  creating.value = true
  try {
    const backup = await $fetch<Backup>('/api/backups', { method: 'POST' })
    backups.value.unshift(backup)
    showToast(true, `Backup created: ${labelFromFilename(backup.filename)}`)
  } catch (err: any) {
    showToast(false, err?.data?.statusMessage || 'Failed to create backup.')
  } finally {
    creating.value = false
  }
}

async function deleteBackup(filename: string) {
  deletingFile.value = filename
  confirmDelete.value = null
  try {
    await $fetch(`/api/backups/${filename}`, { method: 'DELETE' })
    backups.value = backups.value.filter(b => b.filename !== filename)
    showToast(true, 'Backup deleted.')
  } catch (err: any) {
    showToast(false, err?.data?.statusMessage || 'Failed to delete backup.')
  } finally {
    deletingFile.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl mx-auto">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-foreground">Backups</h1>
        <p class="text-sm text-muted-foreground">Manage database backups stored in <code class="font-mono text-primary">data/backups/</code></p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink variant="outline" class="flex items-center gap-2 " as="a" href="/api/backups/report" target="_blank">
          <FileText class="size-3.5" /> 
          View Report
        </NuxtLink>
        <Button class="gap-2" :disabled="creating" @click="createBackup">
          <Loader2 v-if="creating" class="size-3.5 animate-spin" />
          <Database v-else class="size-3.5" />
          Backup Now
        </Button>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div
        v-if="toast"
        :class="[
          'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
          toast.ok
            ? 'border-green-500/30 bg-green-500/10 text-green-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400',
        ]"
      >
        <CheckCircle2 v-if="toast.ok" class="size-4 shrink-0" />
        <XCircle v-else class="size-4 shrink-0" />
        {{ toast.message }}
      </div>
    </Transition>

    <!-- List -->
    <Card class="overflow-hidden">
      <div class="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border">
        <div class="flex items-center gap-2">
          <HardDrive class="size-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Available Backups</h2>
          <span v-if="!loading" class="text-xs text-muted-foreground">({{ backups.length }})</span>
        </div>
        <button
          class="text-muted-foreground hover:text-foreground transition-colors"
          :disabled="loading"
          title="Refresh"
          @click="load"
        >
          <RefreshCw :class="['size-3.5', loading && 'animate-spin']" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
        <Loader2 class="size-4 animate-spin" />
        Loading backups…
      </div>

      <!-- Empty -->
      <div v-else-if="backups.length === 0" class="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Database class="size-8 opacity-30" />
        <p class="text-sm">No backups yet.</p>
        <p class="text-xs">Click <strong class="text-foreground">Backup Now</strong> to create the first one.</p>
      </div>

      <!-- Backup rows -->
      <ul v-else class="divide-y divide-border">
        <li
          v-for="backup in backups"
          :key="backup.filename"
          class="flex items-center justify-between gap-4 px-5 py-3.5"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-foreground font-mono truncate">{{ labelFromFilename(backup.filename) }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ formatSize(backup.sizeBytes) }} &middot; {{ formatDate(backup.createdAt) }}
            </p>
          </div>

          <!-- Delete button / confirm -->
          <div class="flex items-center gap-2 shrink-0">
            <template v-if="confirmDelete === backup.filename">
              <span class="text-xs text-muted-foreground">Delete?</span>
              <Button
                variant="destructive"
                size="sm"
                class="h-7 px-2.5 text-xs gap-1"
                :disabled="deletingFile === backup.filename"
                @click="deleteBackup(backup.filename)"
              >
                <Loader2 v-if="deletingFile === backup.filename" class="size-3 animate-spin" />
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 px-2.5 text-xs"
                @click="confirmDelete = null"
              >
                No
              </Button>
            </template>
            <Button
              v-else
              variant="ghost"
              size="icon"
              class="size-7 text-muted-foreground hover:text-destructive"
              title="Delete backup"
              :disabled="deletingFile === backup.filename"
              @click="confirmDelete = backup.filename"
            >
              <Trash2 class="size-3.5" />
            </Button>
          </div>
        </li>
      </ul>
    </Card>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
