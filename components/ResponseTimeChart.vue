<script setup lang="ts">
import type { Heartbeat } from '~/stores/monitors'

interface Props {
  heartbeats: Heartbeat[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 120
})

const svgRef = ref<SVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const { width: containerWidth } = useElementSize(containerRef)

const chartData = computed(() => {
  const hbs = props.heartbeats
    .filter(h => h.responseTimeMs !== null && h.responseTimeMs !== undefined)
    .slice(-100)

  if (hbs.length < 2) return null

  const times = hbs.map(h => h.responseTimeMs as number)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const range = maxTime - minTime || 1

  const w = containerWidth.value || 600
  const h = props.height
  const padding = { top: 10, right: 10, bottom: 30, left: 50 }
  const chartW = w - padding.left - padding.right
  const chartH = h - padding.top - padding.bottom

  const points = hbs.map((hb, i) => {
    const x = padding.left + (i / (hbs.length - 1)) * chartW
    const y = padding.top + chartH - ((hb.responseTimeMs! - minTime) / range) * chartH
    return { x, y, hb }
  })

  // Build SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  // Build fill path (area under curve)
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const fillPath = `${linePath} L ${lastPoint.x} ${padding.top + chartH} L ${firstPoint.x} ${padding.top + chartH} Z`

  // Y axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(fraction => ({
    y: padding.top + chartH - fraction * chartH,
    value: Math.round(minTime + fraction * range)
  }))

  // X axis labels (show ~5 timestamps)
  const step = Math.floor(hbs.length / 5) || 1
  const xLabels = hbs
    .filter((_, i) => i % step === 0 || i === hbs.length - 1)
    .map((hb, i, arr) => {
      const originalIndex = hbs.indexOf(hb)
      const x = padding.left + (originalIndex / (hbs.length - 1)) * chartW
      return {
        x,
        label: hb.checkedAt
          ? new Date(hb.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''
      }
    })

  return {
    linePath,
    fillPath,
    points,
    yLabels,
    xLabels,
    padding,
    chartW,
    chartH,
    minTime,
    maxTime,
    avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  }
})

const tooltipState = ref<{ visible: boolean; x: number; y: number; value: number; time: string }>({
  visible: false,
  x: 0,
  y: 0,
  value: 0,
  time: ''
})

function onMouseMove(event: MouseEvent, point: { x: number; y: number; hb: Heartbeat }) {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
  tooltipState.value = {
    visible: true,
    x: point.x,
    y: point.y,
    value: point.hb.responseTimeMs!,
    time: point.hb.checkedAt ? new Date(point.hb.checkedAt).toLocaleString() : ''
  }
}

function onMouseLeave() {
  tooltipState.value.visible = false
}
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <div v-if="!chartData" class="flex items-center justify-center text-muted-foreground text-sm py-8">
      Not enough data to display chart
    </div>
    <svg
      v-else
      ref="svgRef"
      :width="containerWidth || 600"
      :height="height"
      class="w-full overflow-visible"
      @mouseleave="onMouseLeave"
    >
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <g>
        <line
          v-for="label in chartData.yLabels"
          :key="label.y"
          :x1="chartData.padding.left"
          :y1="label.y"
          :x2="(containerWidth || 600) - chartData.padding.right"
          :y2="label.y"
          stroke="currentColor"
          stroke-opacity="0.1"
          stroke-dasharray="4,4"
          class="text-muted-foreground"
        />
      </g>

      <!-- Area fill -->
      <path
        :d="chartData.fillPath"
        fill="url(#areaGradient)"
      />

      <!-- Line -->
      <path
        :d="chartData.linePath"
        fill="none"
        stroke="#3b82f6"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- Y axis labels -->
      <g>
        <text
          v-for="label in chartData.yLabels"
          :key="label.y"
          :x="chartData.padding.left - 6"
          :y="label.y + 4"
          text-anchor="end"
          class="text-xs fill-muted-foreground"
          font-size="10"
          fill="rgb(var(--muted-foreground))"
          style="fill: rgb(100 116 139)"
        >{{ label.value }}ms</text>
      </g>

      <!-- X axis labels -->
      <g>
        <text
          v-for="label in chartData.xLabels"
          :key="label.x"
          :x="label.x"
          :y="height - 4"
          text-anchor="middle"
          font-size="10"
          style="fill: rgb(100 116 139)"
        >{{ label.label }}</text>
      </g>

      <!-- Data points (invisible hit areas) -->
      <circle
        v-for="point in chartData.points"
        :key="point.hb.id"
        :cx="point.x"
        :cy="point.y"
        r="6"
        fill="transparent"
        class="cursor-crosshair"
        @mousemove="onMouseMove($event, point)"
      />

      <!-- Tooltip -->
      <g v-if="tooltipState.visible" :transform="`translate(${tooltipState.x}, ${tooltipState.y})`">
        <circle r="4" fill="#3b82f6" />
        <rect
          :x="tooltipState.x > (containerWidth || 600) / 2 ? -120 : 10"
          y="-30"
          width="110"
          height="26"
          rx="4"
          fill="rgb(30 41 59)"
          stroke="rgb(51 65 85)"
          stroke-width="1"
        />
        <text
          :x="tooltipState.x > (containerWidth || 600) / 2 ? -65 : 65"
          y="-12"
          text-anchor="middle"
          font-size="11"
          style="fill: rgb(226 232 240)"
        >{{ tooltipState.value }}ms</text>
      </g>
    </svg>
  </div>
</template>
