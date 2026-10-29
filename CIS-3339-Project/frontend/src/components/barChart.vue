<template>
  <div>
    <canvas class="p-10" ref="attendanceChart"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart, registerables, Colors } from 'chart.js'

Chart.register(...registerables)
Chart.register(Colors)

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
const attendanceChart = ref(null)
// Chart.js instance - kept out of Vue reactivity on purpose
let chart = null

onMounted(() => {
  chart = new Chart(attendanceChart.value, {
    type: 'bar',
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
      scales: {
        y: {
          ticks: {
            stepSize: 1
          }
        },
        x: {
          gridLines: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Attendance Chart'
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
