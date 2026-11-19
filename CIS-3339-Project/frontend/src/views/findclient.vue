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

  <!-- Shared table: sorting, pagination, and the empty-results row -->
  <DataTable
    v-else
    :columns="columns"
    :rows="clients"
    empty-text="No clients found."
    @row-click="(row) => router.push({ name: 'clientdetails', params: { id: row._id } })" />
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
import DataTable from '../components/DataTable.vue'

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

// Columns for the shared DataTable
const columns = [
  {
    label: 'Name',
    key: 'name',
    render: (client) => `${client.firstName} ${client.lastName}`,
    sortValue: (client) => `${client.lastName} ${client.firstName}`
  },
  { label: 'Phone number', key: 'phoneNumber.primary' },
  { label: 'City', key: 'address.city' }
]

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
