<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'radix-vue'
import { cn } from '~/lib/utils'

interface Option {
  label: string
  value: string | number
}

interface Props {
  modelValue?: string | number
  options: Option[]
  placeholder?: string
  class?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchable: false,
  searchPlaceholder: 'Search…',
})
const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const search = ref('')
const stringValue = computed(() =>
  props.modelValue !== undefined ? String(props.modelValue) : undefined
)

const displayedOptions = computed(() => {
  if (!props.searchable || !search.value.trim()) return props.options
  const q = search.value.toLowerCase()
  return props.options.filter(o => String(o.label).toLowerCase().includes(q))
})

function handleUpdate(val: string) {
  const opt = props.options.find(o => String(o.value) === val)
  emit('update:modelValue', opt ? opt.value : val)
}

function onOpenChange(open: boolean) {
  if (!open) search.value = ''
}

// Stop all keys except Escape from reaching Radix (prevents arrow-key navigation
// while typing in the search box). Escape propagates so Radix closes the dropdown.
function onSearchKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') e.stopPropagation()
}
</script>

<template>
  <SelectRoot
    :model-value="stringValue"
    @update:model-value="handleUpdate"
    @update:open="onOpenChange"
  >
    <SelectTrigger
      :class="cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )"
      :disabled="disabled"
    >
      <SelectValue :placeholder="placeholder ?? 'Select...'" />
      <svg class="h-4 w-4 opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="relative z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        position="popper"
        :side-offset="4"
      >
        <!-- Search input (only when searchable) -->
        <div v-if="searchable" class="flex items-center border-b border-border px-2 py-1.5">
          <svg class="mr-2 size-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            v-model="search"
            :placeholder="searchPlaceholder"
            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            @keydown="onSearchKeydown"
          />
        </div>

        <SelectScrollUpButton class="flex cursor-default items-center justify-center py-1 text-muted-foreground">
          <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </SelectScrollUpButton>

        <SelectViewport class="p-1 max-h-56 overflow-y-auto">
          <SelectItem
            v-for="opt in displayedOptions"
            :key="opt.value"
            :value="String(opt.value)"
            class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
              <svg class="h-4 w-4 data-[state=unchecked]:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <SelectItemText>{{ opt.label }}</SelectItemText>
          </SelectItem>

          <div v-if="displayedOptions.length === 0" class="py-4 text-center text-xs text-muted-foreground">
            No results
          </div>
        </SelectViewport>

        <SelectScrollDownButton class="flex cursor-default items-center justify-center py-1 text-muted-foreground">
          <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </SelectScrollDownButton>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
