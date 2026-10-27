
<!-- Dashboard: Events Attendance and Clients by ZIP Code -->

<template>
  <main>
    <div>
      <h1
        class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10"
      >
        Dashboard
      </h1>

      <br />

      <!-- EVENTS ATTENDANCE SECTION -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>

        <div class="flex flex-col col-span-2">
          <h1
            class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10"
          >
            Events Attendance
          </h1>

          <!-- Loading state -->
          <div
            v-if="loading"
            class="p-4 text-center text-gray-600 mt-10"
          >
            Loading attendance...
          </div>

          <!-- Error state -->
          <div
            v-else-if="error"
            class="p-4 text-red-700 mt-10"
          >
            <p>{{ error }}</p>

            <button
              class="mt-3 px-4 py-2 bg-red-700 text-white rounded"
              @click="loadAttendance"
            >
              Retry
            </button>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="!recentEvents.length"
            class="flex justify-center mt-10"
          >
            No events found.
          </div>

          <!-- Attendance table -->
          <template v-else>
            <table class="min-w-full shadow-md rounded">
              <thead class="bg-gray-50 text-xl">
                <tr>
                  <th class="p-4 text-left">Event Name</th>
                  <th class="p-4 text-left">Event Date</th>
                  <th class="p-4 text-left">Number of Attendees</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-300">
                <tr
                  v-for="event in recentEvents"
                  :key="event._id"
                  @click="editEvent(event._id)"
                  class="cursor-pointer"
                >
                  <td class="p-2 text-left">
                    {{ event.name }}
                  </td>

                  <td class="p-2 text-left">
                    {{ formatDate(event.date) }}
                  </td>

                  <td class="p-2 text-left">
                    {{ event.attendees?.length ?? 0 }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Attendance chart -->
            <AttendanceChart
              :label="labels"
              :chart-data="chartData"
            />
          </template>
        </div>
      </div>

      <!-- CLIENTS BY ZIP CODE SECTION -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>

        <div class="flex flex-col col-span-2">
          <h1
            class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10"
          >
            Clients by Zip Code
          </h1>

          <!-- Loading state -->
          <div
            v-if="zipLoading"
            class="p-4 text-center text-gray-600 mt-10"
          >
            Loading ZIP code data...
          </div>

          <!-- Error state -->
          <div
            v-else-if="zipError"
            class="p-4 text-red-700 mt-10"
          >
            <p>{{ zipError }}</p>

            <button
              class="mt-3 px-4 py-2 bg-red-700 text-white rounded"
              @click="loadZipData"
            >
              Retry
            </button>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="!zips.length"
            class="flex justify-center mt-10"
          >
            No clients found.
          </div>

          <!-- ZIP code table -->
          <template v-else>
            <table class="min-w-full shadow-md rounded">
              <thead class="bg-gray-50 text-xl">
                <tr>
                  <th class="p-4 text-left">Zip Number</th>
                  <th class="p-4 text-left">Client Count</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-300">
                <tr
                  v-for="zip in zips"
                  :key="zip._id"
                >
                  <td class="p-2 text-left">
                    {{ zip._id }}
                  </td>

                  <td class="p-2 text-left">
                    {{ zip.count }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- ZIP code chart -->
            <div class="flex justify-center mt-10">
              <ZipChart
                :label="zipLabels"
                :chart-data="zipChartData"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AttendanceChart from '../components/barChart.vue'
import ZipChart from '../components/donutZipChart.vue'

import {
  getAttendance,
  getClientsByZipCode
} from '../api/api'

import { useApi } from '../composables/useApi'

// Router used to navigate to event details
const router = useRouter()

// API request for Events Attendance
const {
  data: attendanceData,
  loading,
  error,
  execute: loadAttendance
} = useApi(() => getAttendance())

// API request for Clients by ZIP Code
const {
  data: zipData,
  loading: zipLoading,
  error: zipError,
  execute: loadZipData
} = useApi(() => getClientsByZipCode())

// Data for attendance table
const recentEvents = computed(() => attendanceData.value ?? [])

// Data for ZIP code table
const zips = computed(() => zipData.value ?? [])

// Attendance chart labels
const labels = computed(() =>
  recentEvents.value.map(
    (item) => `${item.name} (${formatDate(item.date)})`
  )
)

// Attendance chart values
const chartData = computed(() =>
  recentEvents.value.map(
    (item) => item.attendees?.length ?? 0
  )
)

// ZIP code chart labels
const zipLabels = computed(() =>
  zips.value.map((item) => item._id)
)

// ZIP code chart values
const zipChartData = computed(() =>
  zips.value.map((item) => item.count)
)

// Format dates as MM/DD/YYYY
function formatDate(date) {
  const isoDate = new Date(date)

  const year = isoDate.getUTCFullYear()
  const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(isoDate.getUTCDate()).padStart(2, '0')

  return `${month}/${day}/${year}`
}

// Navigate to event details
function editEvent(id) {
  router.push({
    name: 'eventdetails',
    params: { id }
  })
}

// Load dashboard data when page opens
onMounted(() => {
  loadAttendance()
  loadZipData()
})
</script>
