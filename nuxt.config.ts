export default defineNuxtConfig({
  ssr: false,
  future: { compatibilityVersion: 4 },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', 'shadcn-nuxt', '@vueuse/nuxt'],
  shadcn: {
    prefix: '',
    componentDir: './components/ui'
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts'
  },
  css: ['~/assets/css/main.css'],
  nitro: {
    experimental: {
      websocket: false
    }
  },
  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3']
    }
  },
  compatibilityDate: '2024-11-01'
})
