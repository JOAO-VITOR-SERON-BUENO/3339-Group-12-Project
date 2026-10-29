<template>
  <div>
    <canvas class="p-10" ref="attendanceChart"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { Colors } from 'chart.js';

Chart.register(...registerables)
Chart.register(Colors);

const props = defineProps({
  label: {
    type: Array
  },
  chartData: {
    type: Array
  }
})

// template ref for the canvas element
const attendanceChart = ref(null)
let chart = null

onMounted(() => {
  chart = new Chart(attendanceChart.value, {
    type: 'bar',
    data: {
      labels: props.label,
      datasets: [
        {
          borderWidth: 1,
          data: props.chartData
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

// redraw the chart when the data passed in changes
watch(() => [props.label, props.chartData], () => {
  if (!chart) return
  chart.data.labels = props.label
  chart.data.datasets[0].data = props.chartData
  chart.update()
})

// free the Chart.js instance when the component is removed
onBeforeUnmount(() => {
  if (chart) chart.destroy()
  chart = null
})
</script>
