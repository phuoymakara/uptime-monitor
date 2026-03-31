<script setup lang="ts">
interface Props {
  status: 'up' | 'down' | 'pending' | undefined
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'md'
})

const dotClass = computed(() => {
  const base = 'rounded-full inline-block flex-shrink-0 animate-pulse-dot'
  const sizes: Record<string, string> = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }
  const colors: Record<string, string> = {
    up: 'bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.5)]',
    down: 'bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.5)]',
    pending: 'bg-yellow-500 shadow-[0_0_6px_2px_rgba(234,179,8,0.5)]'
  }
  return `${base} ${sizes[props.size]} ${colors[props.status || 'pending']}`
})

const labelClass = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  const colors: Record<string, string> = {
    up: 'text-green-400',
    down: 'text-red-400',
    pending: 'text-yellow-400'
  }
  return `font-medium ${sizes[props.size]} ${colors[props.status || 'pending']}`
})

const label = computed(() => {
  const labels: Record<string, string> = {
    up: 'UP',
    down: 'DOWN',
    pending: 'PENDING'
  }
  return labels[props.status || 'pending']
})
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span :class="dotClass" />
    <span v-if="showLabel" :class="labelClass">{{ label }}</span>
  </div>
</template>
