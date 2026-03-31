<script setup lang="ts">
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
  { label: '1 hour', value: 3600 }
]

function saveSettings() {
  saved.value = true
  setTimeout(() => { saved.value = false }, 3000)
}
</script>

<template>
  <div class="p-6 max-w-full space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Settings</h1>
      <p class="text-sm text-muted-foreground mt-0.5">Configure global monitoring preferences</p>
    </div>

    <!-- General Settings -->
    <Card class="overflow-hidden">
      <div class="px-5 py-3 border-b border-border">
        <h2 class="font-semibold text-foreground">General</h2>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-1.5">
          <Label>Default Check Interval</Label>
          <p class="text-xs text-muted-foreground">Used when creating new monitors</p>
          <Select v-model="defaultInterval" :options="intervalOptions" />
        </div>
      </div>
    </Card>

    <!-- Notifications (Placeholder) -->
    <Card class="overflow-hidden">
      <div class="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 class="font-semibold text-foreground">Notifications</h2>
        <Badge class="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" variant="outline">
          Coming Soon
        </Badge>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-1.5">
          <Label class="text-muted-foreground">Email Notifications</Label>
          <Input
            v-model="notificationEmail"
            type="email"
            placeholder="alerts@example.com"
            disabled
            class="opacity-50 cursor-not-allowed"
          />
        </div>
        <div class="space-y-1.5">
          <Label class="text-muted-foreground">Webhook URL</Label>
          <Input
            v-model="notificationWebhook"
            type="url"
            placeholder="https://hooks.slack.com/..."
            disabled
            class="opacity-50 cursor-not-allowed"
          />
        </div>
        <p class="text-xs text-muted-foreground">
          Notification integrations will be available in a future update.
        </p>
      </div>
    </Card>

    <!-- Data Management -->
    <Card class="overflow-hidden">
      <div class="px-5 py-3 border-b border-border">
        <h2 class="font-semibold text-foreground">Data Management</h2>
      </div>
      <div class="p-5 space-y-4">
        <div class="flex items-start justify-between gap-4 py-2">
          <div>
            <p class="text-sm font-medium text-foreground">Backup Database</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Creates a timestamped backup of your SQLite database in <code class="font-mono text-primary">data/backups/</code>
            </p>
          </div>
          <Button variant="secondary" size="sm" as="a" href="/api/health" target="_blank" class="flex-shrink-0">
            Run <code class="font-mono text-xs ml-1">yarn db:backup</code>
          </Button>
        </div>
        <div class="flex items-start justify-between gap-4 py-2 border-t border-border">
          <div>
            <p class="text-sm font-medium text-foreground">Heartbeat Retention</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              The system automatically keeps the latest 1,000 heartbeats per monitor.
            </p>
          </div>
          <span class="flex-shrink-0 text-sm text-muted-foreground">1,000 records</span>
        </div>
      </div>
    </Card>

    <!-- About -->
    <Card class="overflow-hidden">
      <div class="px-5 py-3 border-b border-border">
        <h2 class="font-semibold text-foreground">About</h2>
      </div>
      <div class="p-5 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Application</span>
          <span class="text-foreground">Uptime Monitor</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Framework</span>
          <span class="text-foreground font-mono">Nuxt 3 + Nitro</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Database</span>
          <span class="text-foreground font-mono">SQLite + Drizzle ORM</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">UI</span>
          <span class="text-foreground font-mono">shadcn-vue + Tailwind CSS</span>
        </div>
      </div>
    </Card>

    <!-- Save Button -->
    <div class="flex items-center gap-3">
      <Button @click="saveSettings">Save Settings</Button>
      <Transition name="fade">
        <span v-if="saved" class="text-sm text-green-400 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Saved!
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
