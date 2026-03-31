<script setup lang="ts">
interface Props {
  status: 'up' | 'down' | 'pending' | undefined
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'md',
})

const dotSize = computed(() => ({
  sm: 'size-2',
  md: 'size-2.5',
  lg: 'size-3',
}[props.size]))

const dotColor = computed(() => ({
  up: 'bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]',
  down: 'bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.4)]',
  pending: 'bg-yellow-500 shadow-[0_0_6px_2px_rgba(234,179,8,0.4)]',
}[props.status ?? 'pending']))

const labelColor = computed(() => ({
  up: 'text-green-400',
  down: 'text-red-400',
  pending: 'text-yellow-400',
}[props.status ?? 'pending']))

const labelSize = computed(() => ({
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
}[props.size]))

const label = computed(() => ({
  up: 'UP',
  down: 'DOWN',
  pending: 'PENDING',
}[props.status ?? 'pending']))
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span :class="['rounded-full inline-block flex-shrink-0 animate-pulse-dot', dotSize, dotColor]" />
    <span v-if="showLabel" :class="['font-semibold tracking-wide', labelSize, labelColor]">{{ label }}</span>
  </div>
</template>
