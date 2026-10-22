<template>
  <div class="w-1/2">
    <canvas class="p-10" ref="zipChart"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

//define props (label and chartData)
const props = defineProps({
  label: {
    type: Array
  },
  chartData: {
    type: Array
  }
})

// template ref for the canvas element
const zipChart = ref(null)
let chart = null

onMounted(() => { //uses the data to load the chart's values
  chart = new Chart(zipChart.value, {
    type: 'doughnut',
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
