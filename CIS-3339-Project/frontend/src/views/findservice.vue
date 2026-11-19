<!-- This view shows a list of services. Users can search for services and click on a service to be redirected to another component that displays the service's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Find Services
      </h1>
    </div>
    <SearchBar
      v-model="searchParams"
      search-by-label="Search Service By"
      :options="searchOptions"
      :fields="searchFields"
      search-label="Search Service"
      @search="handleSubmitForm"
      @clear="loadData" />

    <hr class="mt-10 mb-10" />
    <!-- Display Found Data -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <!--List of Services table-->
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Services</h2>
        <h3 class="italic">Click table row to view service details</h3>
      </div>
      
<div class="flex flex-col col-span-2">

  <!-- Loading state -->
  <div v-if="loading" class="p-4 text-center text-gray-600">
    Loading services...
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
    :rows="services"
    empty-text="No services found."
    @row-click="(row) => router.push({ name: 'servicedetails', params: { id: row._id } })" />

</div>

    </div>
  </main>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getServices, searchServices } from '../api/api'
import { useApi } from '../composables/useApi'
import SearchBar from '../components/SearchBar.vue'
import DataTable from '../components/DataTable.vue'

// Vue Router for navigating to service details
const router = useRouter()

// Search form values, bound to the SearchBar component
const searchParams = ref({ searchBy: '', name: '', description: '' })

// Choices and inputs rendered by the SearchBar
const searchOptions = [
  { value: 'Service Name', label: 'Service Name' },
  { value: 'Service Description', label: 'Service Description' }
]
const searchFields = [
  {
    key: 'name',
    placeholder: 'Enter service name',
    showWhen: { key: 'searchBy', value: 'Service Name' }
  },
  {
    key: 'description',
    placeholder: 'Enter service description',
    showWhen: { key: 'searchBy', value: 'Service Description' }
  }
]

// Columns for the shared DataTable
const columns = [
  { label: 'Service Name', key: 'name', width: '25%' },
  { label: 'Service Description', key: 'description', width: '75%', class: 'text-sm' }
]

// Remember the last search for retries
const currentQuery = ref(null)

// Shared API request handler
const {
  data,
  loading,
  error,
  execute
} = useApi(() => {
  if (currentQuery.value) {
    return searchServices(currentQuery.value)
  }

  return getServices()
})

// Services shown in the table
const services = computed(() => data.value ?? [])

// Reset search and load all services
async function loadData() {
  searchParams.value = { searchBy: '', name: '', description: '' }

  currentQuery.value = null

  await execute()
}

// Search services by name or description
async function handleSubmitForm() {
  if (searchParams.value.searchBy === 'Service Name') {
    if (!searchParams.value.name) {
      return
    }

    currentQuery.value = {
      searchBy: 'name',
      name: searchParams.value.name
    }

  } else if (searchParams.value.searchBy === 'Service Description') {
    if (!searchParams.value.description) {
      return
    }

    currentQuery.value = {
      searchBy: 'description',
      description: searchParams.value.description
    }

  } else {
    return
  }

  await execute()
}

// Load services when the component opens
onMounted(() => {
  loadData()
})
</script>
