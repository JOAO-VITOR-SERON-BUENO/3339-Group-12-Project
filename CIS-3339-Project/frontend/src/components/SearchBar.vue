<template>
  <div class="px-10 pt-20">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <h2 class="text-2xl font-bold">{{ searchByLabel }}</h2>
      <div class="flex flex-col">
        <select
          class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          :value="modelValue.searchBy"
          @change="updateField('searchBy', $event.target.value)">
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div
        v-for="field in fields"
        v-show="!field.showWhen || modelValue[field.showWhen.key] === field.showWhen.value"
        :key="field.key"
        class="flex flex-col">
        <label class="block">
          <input
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            :type="field.type || 'text'"
            :value="modelValue[field.key]"
            :placeholder="field.placeholder"
            @input="updateField(field.key, $event.target.value)"
            @keyup.enter="emit('search')" />
        </label>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <div></div>
      <div></div>
      <div class="mt-5 grid-cols-2">
        <button
          class="mr-10 border border-red-700 bg-white text-red-700 rounded"
          type="button"
          @click="emit('clear')">
          Clear Search
        </button>
        <button
          class="bg-red-700 text-white rounded"
          type="button"
          @click="emit('search')">
          {{ searchLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  searchByLabel: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    required: true
  },
  fields: {
    type: Array,
    required: true
  },
  searchLabel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear'])

function updateField(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
