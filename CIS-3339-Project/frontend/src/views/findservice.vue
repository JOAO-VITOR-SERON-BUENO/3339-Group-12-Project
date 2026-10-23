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
        <table class="min-w-full shadow-md rounded">
          <thead class="bg-gray-50 text-xl">
            <tr>
              <th class="p-4 text-left" style="width: 25%;">Service Name</th>
              <th class="p-4 text-left" style="width: 75%;">Service Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr @click="$router.push({name: 'servicedetails', params: { id: service._id } })" 
            v-for="service in services" :key="service._id" class="cursor-pointer"
              :class="{ 'hoverRow': hoverId === service._id }" @mouseenter="hoverId = service._id"
              @mouseleave="hoverId = null">
              <td class="p-4 text-left">{{ service.name }}</td>
              <td class="p-4 text-left text-sm">{{ service.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script>
import { getServices, searchServices } from '../api/api'
import { useToast } from 'vue-toastification'
import SearchBar from '../components/SearchBar.vue'

//Notifications
const toast = useToast()

export default {
  components: {
    SearchBar
  },
  data() {
    return {
      //variable to hold the services for the organization
      services: null,
      searchParams: {
        searchBy: null,
        name: null,
        description: null
      },
      searchOptions: [
        { value: 'Service Name', label: 'Service Name' },
        { value: 'Service Description', label: 'Service Description' }
      ],
      searchFields: [
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
      ],
      // variable stores the ID of the row that the mouse is currently hovering over (to highlight the row red)
      hoverId: null,
    }
  },
  mounted() {
    // when component is mounted, load the data
    this.loadData();
  },
  methods: {
    // method called when component is mounted
    async loadData() {
      // Resets all the variables
      this.searchParams = {
        searchBy: '',
        name: '',
        description: ''
      }

      // get list of services
      try {
        const response = await getServices();
        this.services = response;
      } catch (error) {
        toast.error(error)
      }
    },

    // method called when user searches for a service
    async handleSubmitForm() {
      // if user searches by service name
      if (this.searchParams.searchBy === 'Service Name') {
        if (this.searchParams.name) {
          try {
            const query = {
              searchBy: 'name',
              name: this.searchParams.name
            }
            const response = await searchServices(query)
            this.services = response;
          } catch (error) {
            toast.error(error)
          }
        }
        // if user searches by service description
      } else if (this.searchParams.searchBy === 'Service Description') {
        if (this.searchParams.description) {
          try {
            const query = {
              searchBy: 'description',
              description: this.searchParams.description
            }
            const response = await searchServices(query)
            this.services = response;
          } catch (error) {
            toast.error('Error searching services:', error)
          }
        }
      }
    },
  },
}
</script>
