<!-- This view displays a list of events. Users can search for events, and click on an event to be redirected to another component to view that event's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        List of Events
      </h1>
    </div>
    <div class="px-10 pt-20">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <h2 class="text-2xl font-bold">Search Event By</h2>
        <!-- Displays Event Name or Event Date selection -->
        <div class="flex flex-col">
          <select
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            v-model="searchBy">
            <option value="Event Name">Event Name</option>
            <option value="Event Date">Event Date</option>
          </select>
        </div>
        <!--Displays event name search field-->
        <div class="flex flex-col" v-if="searchBy === 'Event Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="name" v-on:keyup.enter="handleSubmitForm" placeholder="Enter event name" />
          </label>
        </div>
        <!-- Displays event date search field -->
        <div class="flex flex-col" v-if="searchBy === 'Event Date'">
          <input
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            type="date" v-model="eventDate" v-on:keyup.enter="handleSubmitForm" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div></div>
        <div></div>
        <!--Clear Search button-->
        <div class="mt-5 grid-cols-2">
          <button class="mr-10 border border-red-700 bg-white text-red-700 rounded" @click="loadData" type="submit">
            Clear Search
          </button>
          <!--Search Event button-->
          <button class="bg-red-700 text-white rounded" @click="handleSubmitForm" type="submit">
            Search Event
          </button>
        </div>
      </div>
    </div>

    <hr class="mt-10 mb-10" />
    <!-- Display Found Data -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <!--Table showing List of Events-->
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Events</h2>
        <h3 class="italic">Click table row to view event details</h3>
      </div>
      
<div class="flex flex-col col-span-2">

  <!-- Loading state -->
  <div v-if="loading" class="p-4 text-center text-gray-600">
    Loading events...
  </div>

  <!-- Error state -->
  <div v-else-if="error" class="p-4 text-red-700">
    <p>{{ error }}</p>

    <button
      class="mt-3 px-4 py-2 bg-red-700 text-white rounded"
      @click="execute"
    >
      Retry
    </button>
  </div>

  <!-- Empty state -->
  <div
    v-else-if="!events.length"
    class="p-4 text-center text-gray-600"
  >
    No events found.
  </div>

  <!-- Events table -->
  <table v-else class="min-w-full shadow-md rounded">
    <thead class="bg-gray-50 text-xl">
      <tr>
        <th class="p-4 text-left">Event Name</th>
        <th class="p-4 text-left">Event Date</th>
        <th class="p-4 text-left">Event Address</th>
      </tr>
    </thead>

    <tbody class="divide-y divide-gray-300">
      <tr
        v-for="event in events"
        :key="event._id"
        @click="router.push({
          name: 'eventdetails',
          params: { id: event._id }
        })"
        class="cursor-pointer"
        :class="{ hoverRow: hoverId === event._id }"
        @mouseenter="hoverId = event._id"
        @mouseleave="hoverId = null"
      >
        <td class="p-2 text-left">{{ event.name }}</td>
        <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
        <td class="p-2 text-left">{{ event.address?.line1 }}</td>
      </tr>
    </tbody>
  </table>

</div>

    </div>
  </main>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEvents, searchEvents } from '../api/api'
import { useApi } from '../composables/useApi'

// Navigation
const router = useRouter()

// Search form variables
const searchBy = ref('')
const name = ref('')
const eventDate = ref('')

// Currently highlighted event row
const hoverId = ref(null)

// Stores the search criteria for retries
const currentQuery = ref(null)

// Shared API handler
const {
  data,
  loading,
  error,
  execute
} = useApi(() => {
  if (currentQuery.value) {
    return searchEvents(currentQuery.value)
  }

  return getEvents()
})

// Events displayed in the table
const events = computed(() => data.value ?? [])

// Reset search and load all events
async function loadData() {
  searchBy.value = ''
  name.value = ''
  eventDate.value = ''
  currentQuery.value = null

  await execute()
}

// Search events by name or date
async function handleSubmitForm() {
  if (searchBy.value === 'Event Name') {
    if (!name.value) {
      return
    }

    currentQuery.value = {
      searchBy: 'name',
      name: name.value
    }

  } else if (searchBy.value === 'Event Date') {
    if (!eventDate.value) {
      return
    }

    // The date input already provides YYYY-MM-DD
    currentQuery.value = {
      searchBy: 'date',
      eventDate: eventDate.value
    }

  } else {
    return
  }

  await execute()
}

// Format the date as MM/DD/YYYY
function formatDate(date) {
  const isoDate = new Date(date)

  const year = isoDate.getUTCFullYear()
  const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(isoDate.getUTCDate()).padStart(2, '0')

  return `${month}/${day}/${year}`
}

// Fetch events when the page opens
onMounted(() => {
  loadData()
})
</script>
