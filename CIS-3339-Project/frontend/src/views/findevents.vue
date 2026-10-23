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
        <table class="min-w-full shadow-md rounded">
          <thead class="bg-gray-50 text-xl">
            <tr>
              <th class="p-4 text-left">Event Name</th>
              <th class="p-4 text-left">Event Date</th>
              <th class="p-4 text-left">Event Address</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr @click="$router.push({name: 'eventdetails', params: { id: event._id } })"
              v-for="event in events" :key="event._id" class="cursor-pointer"
              :class="{ 'hoverRow': hoverId === event._id }" @mouseenter="hoverId = event._id"
              @mouseleave="hoverId = null">
              <td class="p-2 text-left">{{ event.name }}</td>
              <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
              <td class="p-2 text-left">{{ event.address.line1 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script>
import { getEvents, searchEvents } from '../api/api'
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
      //variable to hold all events for the organization
      events: null,
      searchParams: {
        searchBy: null,
        name: null,
        eventDate: null
      },
      searchOptions: [
        { value: 'Event Name', label: 'Event Name' },
        { value: 'Event Date', label: 'Event Date' }
      ],
      searchFields: [
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
      // Resets variables used for search
      this.searchParams = {
        searchBy: null,
        name: null,
        eventDate: null
      }

      // show loading wheel
      this.isLoading = true;
      // get list of events
      try {
        const response = await getEvents();
        this.events = response;
      } catch (error) {
        toast.error('loadData error', error)
      }
    },

    // method called when user searches for an event
    async handleSubmitForm() {
      // if user searches by event name
      if (this.searchParams.searchBy === 'Event Name') {
        if (this.searchParams.name) {
          try {
            const query = {
              searchBy: 'name',
              name: this.searchParams.name
            };
            const response = await searchEvents(query);
            this.events = response;
          } catch (error) {
            toast.error('Error searching events', error)
          }
        }
        // if user searches by event date
      } else if (this.searchParams.searchBy === 'Event Date') {
        if (this.searchParams.eventDate) {
          try {
            const eventDate = new Date(this.searchParams.eventDate);
            const formattedDate = eventDate.toISOString().substring(0, 10);
            const query = {
              searchBy: 'date',
              eventDate: formattedDate
            };
            const response = await searchEvents(query);
            this.events = response;
          } catch (error) {
            toast.error('Error searching events:', error)
          }
        }
      }
    },

    // method called for each event date so it will be formatted correctly on the table
    formatDate(date) {
      const isoDate = new Date(date);
      const year = isoDate.getUTCFullYear();
      const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(isoDate.getUTCDate()).padStart(2, '0');
      return `${month}/${day}/${year}`;
    },
  },
}
</script>
