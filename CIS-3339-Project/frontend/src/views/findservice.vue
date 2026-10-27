<!-- This view shows a list of services. Users can search for services and click on a service to be redirected to another component that displays the service's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Find Services
      </h1>
    </div>
    <div class="px-10 pt-20">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <h2 class="text-2xl font-bold">Search Service By</h2>
        <!-- Displays Service Name and Description selection -->
        <div class="flex flex-col">
          <select
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            v-model="searchBy">
            <option value="Service Name">Service Name</option>
            <option value="Service Description">Service Description</option>
          </select>
        </div>
        <!--Display service name search field-->
        <div class="flex flex-col" v-if="searchBy === 'Service Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="name" v-on:keyup.enter="handleSubmitForm" placeholder="Enter service name" />
          </label>
        </div>
        <!--Display service description search field-->
        <div class="flex flex-col" v-if="searchBy === 'Service Description'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="description" v-on:keyup.enter="handleSubmitForm" placeholder="Enter service description" />
          </label>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div></div>
        <div></div>
        <div class="mt-5 grid-cols-2">
          <!--Clear Search button-->
          <button class="mr-10 border border-red-700 bg-white text-red-700 rounded" @click="loadData" type="submit">
            Clear Search
          </button>
          <!--Search Service button-->
          <button class="bg-red-700 text-white rounded" @click="handleSubmitForm" type="submit">
            Search Service
          </button>
        </div>
      </div>
    </div>

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

  <!-- Empty state -->
  <div
    v-else-if="!services.length"
    class="p-4 text-center text-gray-600"
  >
    No services found.
  </div>

  <!-- Existing Services table -->
  <table v-else class="min-w-full shadow-md rounded">
    <thead class="bg-gray-50 text-xl">
      <tr>
        <th class="p-4 text-left" style="width: 25%;">
          Service Name
        </th>
        <th class="p-4 text-left" style="width: 75%;">
          Service Description
        </th>
      </tr>
    </thead>

    <tbody class="divide-y divide-gray-300">
      <tr
        v-for="service in services"
        :key="service._id"
        @click="router.push({
          name: 'servicedetails',
          params: { id: service._id }
        })"
        class="cursor-pointer"
        :class="{ hoverRow: hoverId === service._id }"
        @mouseenter="hoverId = service._id"
        @mouseleave="hoverId = null"
      >
        <td class="p-4 text-left">
          {{ service.name }}
        </td>

        <td class="p-4 text-left text-sm">
          {{ service.description }}
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
import { getServices, searchServices } from '../api/api'
import { useApi } from '../composables/useApi'

// Vue Router for navigating to service details
const router = useRouter()

// Search form variables
const searchBy = ref('')
const name = ref('')
const description = ref('')

// Highlight the row under the mouse
const hoverId = ref(null)

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
  searchBy.value = ''
  name.value = ''
  description.value = ''

  currentQuery.value = null

  await execute()
}

// Search services by name or description
async function handleSubmitForm() {
  if (searchBy.value === 'Service Name') {
    if (!name.value) {
      return
    }

    currentQuery.value = {
      searchBy: 'name',
      name: name.value
    }

  } else if (searchBy.value === 'Service Description') {
    if (!description.value) {
      return
    }

    currentQuery.value = {
      searchBy: 'description',
      description: description.value
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
