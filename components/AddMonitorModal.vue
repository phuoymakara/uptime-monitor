<script setup lang="ts">
import { useMonitorsStore } from '~/stores/monitors'

const emit = defineEmits<{
  close: []
  created: []
}>()

const store = useMonitorsStore()

const open = ref(true)

const form = ref({
  name: '',
  url: '',
  type: 'http' as 'http' | 'tcp',
  intervalSeconds: 60,
  timeoutSeconds: 30,
  enabled: true
})

const errors = ref<Record<string, string>>({})
const submitting = ref(false)

const intervalOptions = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 }
]

function validate() {
  errors.value = {}
  if (!form.value.name.trim()) errors.value.name = 'Name is required'
  if (!form.value.url.trim()) errors.value.url = 'URL is required'
  if (form.value.type === 'http' && !form.value.url.match(/^https?:\/\//i)) {
    errors.value.url = 'HTTP monitors require a URL starting with http:// or https://'
  }
  if (form.value.type === 'tcp') {
    const cleaned = form.value.url.replace(/^tcp:\/\//i, '')
    const parts = cleaned.split(':')
    if (parts.length !== 2 || isNaN(parseInt(parts[1]))) {
      errors.value.url = 'TCP monitors require format: host:port or tcp://host:port'
    }
  }
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    await store.createMonitor(form.value)
    emit('created')
    emit('close')
  } catch (err: any) {
    errors.value.general = err.message || 'Failed to create monitor'
  } finally {
    submitting.value = false
  }
}

function handleOpenChange(val: boolean) {
  if (!val) emit('close')
}
</script>

<template>
  <Dialog :open="open" title="Add New Monitor" @update:open="handleOpenChange">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div v-if="errors.general" class="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
        {{ errors.general }}
      </div>

      <div class="space-y-1.5">
        <Label for="add-name">Display Name</Label>
        <Input
          id="add-name"
          v-model="form.name"
          placeholder="My Website"
          :class="errors.name ? 'border-destructive focus-visible:ring-destructive' : ''"
        />
        <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
      </div>

      <div class="space-y-1.5">
        <Label>Monitor Type</Label>
        <div class="grid grid-cols-2 gap-2">
          <Button
            type="button"
            :variant="form.type === 'http' ? 'default' : 'outline'"
            class="gap-2"
            @click="form.type = 'http'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            HTTP/HTTPS
          </Button>
          <Button
            type="button"
            :variant="form.type === 'tcp' ? 'default' : 'outline'"
            class="gap-2"
            @click="form.type = 'tcp'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            TCP Port
          </Button>
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="add-url">{{ form.type === 'http' ? 'URL' : 'Host:Port' }}</Label>
        <Input
          id="add-url"
          v-model="form.url"
          :placeholder="form.type === 'http' ? 'https://example.com' : 'example.com:80 or tcp://example.com:443'"
          class="font-mono"
          :class="errors.url ? 'border-destructive focus-visible:ring-destructive' : ''"
        />
        <p v-if="errors.url" class="text-xs text-destructive">{{ errors.url }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <Label>Check Interval</Label>
          <Select
            v-model="form.intervalSeconds"
            :options="intervalOptions"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="add-timeout">Timeout (seconds)</Label>
          <Input
            id="add-timeout"
            v-model.number="form.timeoutSeconds"
            type="number"
            min="5"
            max="60"
          />
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Switch
          :checked="form.enabled"
          @update:checked="form.enabled = $event"
        />
        <Label>Enable monitoring</Label>
      </div>

      <div class="flex gap-3 pt-2">
        <Button type="button" variant="outline" class="flex-1" @click="emit('close')">
          Cancel
        </Button>
        <Button type="submit" class="flex-1 gap-2" :disabled="submitting">
          <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ submitting ? 'Creating...' : 'Create Monitor' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
