<template>
  <div class="w-1/2">
    <canvas class="p-10" ref="zipChart"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

//define props (label and chartData)
const props = defineProps({
  label: {
    type: Array,
    default: () => []
  },
  chartData: {
    type: Array,
    default: () => []
  }
})

// canvas element the chart is drawn on
const zipChart = ref(null)
// Chart.js instance - kept out of Vue reactivity on purpose
let chart = null

onMounted(() => { //uses the data to load the chart's values
  chart = new Chart(zipChart.value, {
    type: 'doughnut',
    data: {
      labels: [...props.label],
      datasets: [
        {
          borderWidth: 1,
          data: [...props.chartData]
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Clients by Zip Code'
        }
      },
      responsive: true,
      maintainAspectRatio: true
    }
  })
})

// update the existing chart in place when the props change
watch(
  [() => props.label, () => props.chartData],
  ([label, chartData]) => {
    if (!chart) return
    chart.data.labels = [...label]
    chart.data.datasets[0].data = [...chartData]
    chart.update()
  },
  { deep: true }
)

// destroy the chart so the canvas and its listeners are released
onBeforeUnmount(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>
