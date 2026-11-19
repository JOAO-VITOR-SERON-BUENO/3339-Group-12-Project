<!--
  Reusable table for the client, event, and service list views.

  Props:
    columns   [{ label, key, render?, sortValue?, class?, width? }]
              key       field to show and sort by (dotted keys reach nested fields, e.g. 'address.city')
              render    optional (row) => text to display instead of the raw field
              sortValue optional (row) => value to sort by (defaults to the raw field, never render)
    rows      the already-loaded records; sorting and pagination happen client-side
    pageSize  rows per page (default 10)
    rowKey    unique field per row (default '_id')
    emptyText message shown in the table when there are no rows

  Emits:
    row-click (row) when a row is clicked or activated with Enter

  Clicking a header cycles ascending -> descending -> unsorted. A new rows array (a search, a
  reload) resets to page 1, so a page never shows rows left over from the previous results.
-->
<template>
  <div class="flex flex-col">
    <table class="min-w-full shadow-md rounded">
      <thead class="bg-gray-50 text-xl">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            class="p-0 text-left"
            :style="column.width ? { width: column.width } : null"
            :aria-sort="ariaSort(column)">
            <button
              type="button"
              class="w-full p-4 flex items-center gap-2 text-left font-bold"
              :title="`Sort by ${column.label}`"
              @click="toggleSort(column)">
              <span>{{ column.label }}</span>
              <span class="text-sm text-gray-500" aria-hidden="true">{{ sortIcon(column) }}</span>
            </button>
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-gray-300">
        <tr v-if="page.total === 0">
          <td :colspan="columns.length" class="p-4 text-center text-gray-600">
            {{ emptyText }}
          </td>
        </tr>
        <tr
          v-for="row in page.rows"
          v-else
          :key="row[rowKey]"
          class="cursor-pointer"
          :class="{ hoverRow: hoverKey === row[rowKey] }"
          tabindex="0"
          @mouseenter="hoverKey = row[rowKey]"
          @mouseleave="hoverKey = null"
          @click="emit('row-click', row)"
          @keydown.enter="emit('row-click', row)">
          <td v-for="column in columns" :key="column.key" class="p-2 text-left" :class="column.class">
            {{ cellText(row, column) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- pagination -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-gray-700">
      <p aria-live="polite">Showing {{ page.from }}-{{ page.to }} of {{ page.total }}</p>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="border border-red-700 text-red-700 rounded px-3 py-1 disabled:opacity-40"
          :disabled="page.page <= 1"
          @click="currentPage = page.page - 1">
          Previous
        </button>
        <span>Page {{ page.page }} of {{ page.pageCount }}</span>
        <button
          type="button"
          class="border border-red-700 text-red-700 rounded px-3 py-1 disabled:opacity-40"
          :disabled="page.page >= page.pageCount"
          @click="currentPage = page.page + 1">
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getValue, sortRows, nextDirection, paginate } from './dataTableUtils'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  pageSize: { type: Number, default: 10 },
  rowKey: { type: String, default: '_id' },
  emptyText: { type: String, default: 'No results' }
})

const emit = defineEmits(['row-click'])

const sortKey = ref(null)
const sortDirection = ref(null)
const currentPage = ref(1)
const hoverKey = ref(null)

const sortColumn = computed(() => props.columns.find((c) => c.key === sortKey.value))

const sortedRows = computed(() => sortRows(props.rows, sortColumn.value, sortDirection.value))

const page = computed(() => paginate(sortedRows.value, currentPage.value, props.pageSize))

// new results (search, clear, reload) always start on page 1
watch(
  () => props.rows,
  () => {
    currentPage.value = 1
  }
)

function toggleSort(column) {
  // clicking a different column starts that column at ascending
  const direction = sortKey.value === column.key ? nextDirection(sortDirection.value) : 'asc'
  sortKey.value = direction ? column.key : null
  sortDirection.value = direction
  currentPage.value = 1
}

function sortIcon(column) {
  if (sortKey.value !== column.key) return '↕'
  return sortDirection.value === 'asc' ? '▲' : '▼'
}

function ariaSort(column) {
  if (sortKey.value !== column.key) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

function cellText(row, column) {
  const value = column.render ? column.render(row) : getValue(row, column.key)
  return value ?? ''
}
</script>
