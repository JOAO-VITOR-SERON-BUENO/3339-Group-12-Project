<!-- This view displays a list of events. Users can search for events, and click on an event to be redirected to another component to view that event's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        List of Events
      </h1>
    </div>
    <SearchBar
      v-model="searchParams"
      search-by-label="Search Event By"
      :options="searchOptions"
      :fields="searchFields"
      search-label="Search Event"
      @search="handleSubmitForm"
      @clear="loadData" />

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
import SearchBar from '../components/SearchBar.vue'

// Navigation
const router = useRouter()

// Search form values, bound to the SearchBar component
const searchParams = ref({ searchBy: '', name: '', eventDate: '' })

// Choices and inputs rendered by the SearchBar
const searchOptions = [
  { value: 'Event Name', label: 'Event Name' },
  { value: 'Event Date', label: 'Event Date' }
]
const searchFields = [
  {
    key: 'name',
    placeholder: 'Enter event name',
    showWhen: { key: 'searchBy', value: 'Event Name' }
  },
  {
    key: 'eventDate',
    type: 'date',
    showWhen: { key: 'searchBy', value: 'Event Date' }
  }
]

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
  searchParams.value = { searchBy: '', name: '', eventDate: '' }
  currentQuery.value = null

  await execute()
}

// Search events by name or date
async function handleSubmitForm() {
  if (searchParams.value.searchBy === 'Event Name') {
    if (!searchParams.value.name) {
      return
    }

    currentQuery.value = {
      searchBy: 'name',
      name: searchParams.value.name
    }

  } else if (searchParams.value.searchBy === 'Event Date') {
    if (!searchParams.value.eventDate) {
      return
    }

    // The date input already provides YYYY-MM-DD
    currentQuery.value = {
      searchBy: 'date',
      eventDate: searchParams.value.eventDate
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
