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
        <table class="min-w-full shadow-md rounded">
          <thead class="bg-gray-50 text-xl">
            <tr>
              <th class="p-4 text-left">Name</th>
              <th class="p-4 text-left">Phone number</th>
              <th class="p-4 text-left">City</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr @click="$router.push({ name: 'clientdetails', params: { id: client._id } })" v-for="client in clients"
              :key="client._id" class="cursor-pointer" :class="{ 'hoverRow': hoverId === client._id }"
              @mouseenter="hoverId = client._id" @mouseleave="hoverId = null">
              <td class="p-2 text-left">
                {{ client.firstName + ' ' + client.lastName }}
              </td>
              <td class="p-2 text-left">
                {{ client.phoneNumber.primary }}
              </td>
              <td class="p-2 text-left">{{ client.address.city }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script>
import { getClients, searchClients } from '../api/api'
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
      //variable to store all clients and their information for the organization
      clients: null,
      searchParams: {
        searchBy: '',
        firstName: '',
        lastName: '',
        phoneNumber: ''
      },
      searchOptions: [
        { value: 'Client Name', label: 'Client Name' },
        { value: 'Client Number', label: 'Client Number' }
      ],
      searchFields: [
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
      ],
      // variable stores the ID of the row that the mouse is currently hovering over (to highlight the row red)
      hoverId: null,
    }
  },
  mounted() {
    // when component is mounted, load the data -
    this.loadData()
  },
  methods: {
    // method called when component is mounted
    async loadData() {
      // Resets all the variables
      this.searchParams = {
        searchBy: '',
        firstName: '',
        lastName: '',
        phoneNumber: ''
      }

      // get list of clients
      try {
        const response = await getClients();
        this.clients = response;
      } catch (error) {
        toast.error(error)
      }
    },
    // method called when user searches for clients
    async handleSubmitForm() {
      // if user searched by client name
      if (this.searchParams.searchBy === 'Client Name') {
        if (this.searchParams.firstName || this.searchParams.lastName) {
          try {
            const query = {
              searchBy: 'name',
              firstName: this.searchParams.firstName,
              lastName: this.searchParams.lastName,
            }
            const response = await searchClients(query)
            this.clients = response;
          } catch (error) {
            toast.error(error)
          }
        }
        // if user searches by client phone number
      } else if (this.searchParams.searchBy === 'Client Number') {
        if (this.searchParams.phoneNumber) {
          try {
            const query = {
              searchBy: 'number',
              phoneNumber: this.searchParams.phoneNumber
            }
            const response = await searchClients(query)
            this.clients = response;
          } catch (error) {
            toast.error(error)
          }
        }
      }
    },
  },
}
</script>