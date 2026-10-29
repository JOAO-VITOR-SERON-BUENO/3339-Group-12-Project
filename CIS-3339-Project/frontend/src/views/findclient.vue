<!-- This view displays a list of clients. The user can search for clients, and click on a client to redirect to another component to view that client's information -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Find Client
      </h1>
    </div>
    <SearchBar
      v-model="searchParams"
      search-by-label="Search Client By"
      :options="searchOptions"
      :fields="searchFields"
      search-label="Search Client"
      @search="handleSubmitForm"
      @clear="loadData" />

    <hr class="mt-10 mb-10" />
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Clients</h2>
        <h3 class="italic">Click table row to view client details</h3>
      </div>
      <!--Table showing list of Clients-->
      <div class="flex flex-col col-span-2">

  <!-- Loading state -->
  <div v-if="loading" class="p-4 text-center text-gray-600">
    Loading clients...
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
    v-else-if="!clients || clients.length === 0"
    class="p-4 text-center text-gray-600"
  >
    No clients found.
  </div>

  <!-- Existing clients table -->
  <table v-else class="min-w-full shadow-md rounded">
    <thead class="bg-gray-50 text-xl">
      <tr>
        <th class="p-4 text-left">Name</th>
        <th class="p-4 text-left">Phone number</th>
        <th class="p-4 text-left">City</th>
      </tr>
    </thead>

    <tbody class="divide-y divide-gray-300">
      <tr
        v-for="client in clients"
        :key="client._id"
        @click="router.push({
          name: 'clientdetails',
          params: { id: client._id }
        })"
        class="cursor-pointer"
        :class="{ hoverRow: hoverId === client._id }"
        @mouseenter="hoverId = client._id"
        @mouseleave="hoverId = null"
      >
        <td class="p-2 text-left">
          {{ client.firstName + ' ' + client.lastName }}
        </td>
        <td class="p-2 text-left">
          {{ client.phoneNumber?.primary }}
        </td>
        <td class="p-2 text-left">
          {{ client.address?.city }}
        </td>
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
import { getClients, searchClients } from '../api/api'
import { useApi } from '../composables/useApi'
import SearchBar from '../components/SearchBar.vue'

// Navigation
const router = useRouter()

// Search form values, bound to the SearchBar component
const searchParams = ref({ searchBy: '', firstName: '', lastName: '', phoneNumber: '' })

// Choices and inputs rendered by the SearchBar
const searchOptions = [
  { value: 'Client Name', label: 'Client Name' },
  { value: 'Client Number', label: 'Client Number' }
]
const searchFields = [
  {
    key: 'firstName',
    placeholder: 'Enter first name',
    showWhen: { key: 'searchBy', value: 'Client Name' }
  },
  {
    key: 'lastName',
    placeholder: 'Enter last name',
    showWhen: { key: 'searchBy', value: 'Client Name' }
  },
  {
    key: 'phoneNumber',
    placeholder: 'Enter Client Phone Number',
    showWhen: { key: 'searchBy', value: 'Client Number' }
  }
]

// Highlight the row the mouse is hovering over
const hoverId = ref(null)

// Keep track of the current request.
// Null means load all clients instead of searching.
const currentQuery = ref(null)

// Reusable API request handler
const {
  data,
  loading,
  error,
  execute
} = useApi(() => {
  if (currentQuery.value) {
    return searchClients(currentQuery.value)
  }

  return getClients()
})

// The table reads its clients from the composable.
const clients = computed(() => data.value ?? [])

// Load all clients and reset the search
async function loadData() {
  searchParams.value = { searchBy: '', firstName: '', lastName: '', phoneNumber: '' }

  currentQuery.value = null

  await execute()
}

// Search clients using the selected search criteria
async function handleSubmitForm() {
  if (searchParams.value.searchBy === 'Client Name') {
    if (!searchParams.value.firstName && !searchParams.value.lastName) {
      return
    }

    currentQuery.value = {
      searchBy: 'name',
      firstName: searchParams.value.firstName,
      lastName: searchParams.value.lastName
    }
  } else if (searchParams.value.searchBy === 'Client Number') {
    if (!searchParams.value.phoneNumber) {
      return
    }

    currentQuery.value = {
      searchBy: 'number',
      phoneNumber: searchParams.value.phoneNumber
    }
  } else {
    return
  }

  await execute()
}

// Automatically load clients when the page opens
onMounted(() => {
  loadData()
})
</script>
