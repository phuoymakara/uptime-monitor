<script setup lang="ts">
import { CheckCircle2, Database, Info } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const defaultInterval = ref(60)
const notificationEmail = ref('')
const notificationWebhook = ref('')
const saved = ref(false)

const intervalOptions = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
]

function saveSettings() {
  saved.value = true
  setTimeout(() => { saved.value = false }, 3000)
}
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl mx-auto">
    <div>
      <h1 class="text-xl font-bold text-foreground">Settings</h1>
      <p class="text-sm text-muted-foreground">Configure global monitoring preferences</p>
    </div>

    <!-- General -->
    <Card class="overflow-hidden">
      <div class="px-5 py-3.5 border-b border-border">
        <h2 class="text-sm font-semibold text-foreground">General</h2>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-1.5">
          <Label>Default Check Interval</Label>
          <p class="text-xs text-muted-foreground">Applied when creating new monitors</p>
          <div class="max-w-xs">
            <Select v-model="defaultInterval" :options="intervalOptions" />
          </div>
        </div>
      </div>
    </Card>

    <!-- Notifications -->
    <Card class="overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 class="text-sm font-semibold text-foreground">Notifications</h2>
        <Badge class="bg-yellow-500/10 text-yellow-400 border-yellow-500/20" variant="outline">Coming Soon</Badge>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-1.5">
          <Label class="text-muted-foreground">Email Notifications</Label>
          <Input
            v-model="notificationEmail"
            type="email"
            placeholder="alerts@example.com"
            disabled
            class="max-w-xs opacity-50 cursor-not-allowed"
          />
        </div>
        <div class="space-y-1.5">
          <Label class="text-muted-foreground">Webhook URL</Label>
          <Input
            v-model="notificationWebhook"
            type="url"
            placeholder="https://hooks.slack.com/…"
            disabled
            class="opacity-50 cursor-not-allowed"
          />
        </div>
        <div class="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          <Info class="size-3.5 shrink-0 mt-0.5" />
          Notification integrations will be available in a future update.
        </div>
      </div>
    </Card>

    <!-- Data Management -->
    <Card class="overflow-hidden">
      <div class="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <Database class="size-4 text-muted-foreground" />
        <h2 class="text-sm font-semibold text-foreground">Data Management</h2>
      </div>
      <div class="divide-y divide-border">
        <div class="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p class="text-sm font-medium text-foreground">Backup Database</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Creates a timestamped copy in <code class="font-mono text-primary">data/backups/</code>
            </p>
          </div>
          <Button variant="secondary" size="sm" as="a" href="/api/health" target="_blank" class="shrink-0 text-xs">
            <code>yarn db:backup</code>
          </Button>
        </div>
        <div class="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p class="text-sm font-medium text-foreground">Heartbeat Retention</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Automatically keeps the latest 100 heartbeats per monitor
            </p>
          </div>
          <span class="text-xs text-muted-foreground shrink-0">100 records</span>
        </div>
      </div>
    </Card>

    <!-- About -->
    <!-- <Card class="overflow-hidden">
      <div class="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <Info class="size-4 text-muted-foreground" />
        <h2 class="text-sm font-semibold text-foreground">About</h2>
      </div>
      <div class="px-5 py-4 space-y-2.5 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-muted-foreground">Application</span>
          <span class="text-foreground font-medium">Uptime Monitor</span>
        </div>
        <Separator />
        <div class="flex justify-between items-center">
          <span class="text-muted-foreground">Framework</span>
          <code class="text-foreground bg-muted/50 px-1.5 py-0.5 rounded">Nuxt 3 + Nitro</code>
        </div>
        <Separator />
        <div class="flex justify-between items-center">
          <span class="text-muted-foreground">Database</span>
          <code class="text-foreground bg-muted/50 px-1.5 py-0.5 rounded">SQLite + Drizzle ORM</code>
        </div>
        <Separator />
        <div class="flex justify-between items-center">
          <span class="text-muted-foreground">UI</span>
          <code class="text-foreground bg-muted/50 px-1.5 py-0.5 rounded">shadcn-vue + Tailwind CSS</code>
        </div>
      </div>
    </Card> -->

    <!-- Save -->
    <div class="flex items-center justify-end gap-3">
      <Button @click="saveSettings">Save Settings</Button>
      <Transition name="fade">
        <span v-if="saved" class="flex items-center gap-1.5 text-sm text-green-400">
          <CheckCircle2 class="size-4" />Saved!
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
