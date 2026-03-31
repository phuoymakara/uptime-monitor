<script setup lang="ts">
import { useMonitorsStore } from '~/stores/monitors'

const store = useMonitorsStore()
const route = useRoute()

const navItems = [
  {
    label: 'Dashboard',
    path: '/',
    icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>`
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>`
  }
]

const isMobileOpen = ref(false)

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Sidebar -->
    <aside class="hidden lg:flex flex-col w-64 bg-card border-r border-border flex-shrink-0">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-base font-bold text-foreground">Uptime Monitor</h1>
          <p class="text-xs text-muted-foreground">Status Dashboard</p>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="px-4 py-3 border-b border-border">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-green-500/10 rounded-lg py-2">
            <div class="text-lg font-bold text-green-400">{{ store.upMonitors }}</div>
            <div class="text-xs text-muted-foreground">Up</div>
          </div>
          <div class="bg-red-500/10 rounded-lg py-2">
            <div class="text-lg font-bold text-red-400">{{ store.downMonitors }}</div>
            <div class="text-xs text-muted-foreground">Down</div>
          </div>
          <div class="bg-yellow-500/10 rounded-lg py-2">
            <div class="text-lg font-bold text-yellow-400">{{ store.pendingMonitors }}</div>
            <div class="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.path)
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          ]"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="item.icon" />
          {{ item.label }}
        </NuxtLink>

        <div class="pt-3 border-t border-border mt-3">
          <p class="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Monitors</p>
          <NuxtLink
            v-for="monitor in store.monitors.slice(0, 10)"
            :key="monitor.id"
            :to="`/monitor/${monitor.id}`"
            :class="[
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              route.path === `/monitor/${monitor.id}`
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            ]"
          >
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="{
                'bg-green-500': monitor.latestHeartbeat?.status === 'up',
                'bg-red-500': monitor.latestHeartbeat?.status === 'down',
                'bg-yellow-500': !monitor.latestHeartbeat || monitor.latestHeartbeat.status === 'pending'
              }"
            />
            <span class="truncate">{{ monitor.name }}</span>
          </NuxtLink>
          <p v-if="store.monitors.length > 10" class="text-xs text-muted-foreground px-3 mt-1">
            +{{ store.monitors.length - 10 }} more
          </p>
        </div>
      </nav>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        <p>Total: {{ store.totalMonitors }} monitor{{ store.totalMonitors !== 1 ? 's' : '' }}</p>
        <p v-if="store.lastFetched" class="mt-0.5">
          Updated {{ new Date(store.lastFetched).toLocaleTimeString() }}
        </p>
      </div>
    </aside>

    <!-- Mobile header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border flex items-center gap-3 px-4 py-3">
      <button class="text-muted-foreground" @click="isMobileOpen = !isMobileOpen">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span class="font-semibold text-foreground">Uptime Monitor</span>
    </div>

    <!-- Mobile sidebar overlay -->
    <Transition name="fade">
      <div
        v-if="isMobileOpen"
        class="lg:hidden fixed inset-0 z-50 bg-black/60"
        @click="isMobileOpen = false"
      >
        <div class="bg-card w-64 h-full" @click.stop>
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h1 class="text-base font-bold text-foreground">Uptime Monitor</h1>
            <button class="text-muted-foreground" @click="isMobileOpen = false">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav class="p-3 space-y-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              ]"
              @click="isMobileOpen = false"
            >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="item.icon" />
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </Transition>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto lg:pt-0 pt-14">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
