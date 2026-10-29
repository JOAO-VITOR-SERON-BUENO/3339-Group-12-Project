<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      @click.self="finish(false)">
      <section
        ref="dialog"
        class="w-full max-w-md rounded bg-white p-6 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        tabindex="-1"
        @keydown="handleKeydown">
        <h2 id="confirmation-title" class="mb-3 text-xl font-bold">{{ title }}</h2>
        <p id="confirmation-message" class="mb-6">
          <slot name="message">{{ message }}</slot>
        </p>
        <div class="flex justify-end gap-3">
          <button
            ref="cancelButton"
            type="button"
            class="border border-gray-500 rounded px-3 py-2"
            @click="finish(false)">
            Cancel
          </button>
          <button
            type="button"
            class="bg-red-700 text-white rounded px-3 py-2"
            @click="finish(true)">
            {{ confirmText }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
const confirmText = ref('Confirm')
const dialog = ref(null)
const cancelButton = ref(null)
let resolveConfirmation
let previouslyFocused

function confirm(options) {
  if (resolveConfirmation) {
    throw new Error('A confirmation is already open.')
  }

  title.value = options.title
  message.value = options.message
  confirmText.value = options.confirmText || 'Confirm'
  previouslyFocused = document.activeElement
  visible.value = true

  return new Promise((resolve) => {
    resolveConfirmation = resolve
    nextTick(() => cancelButton.value?.focus())
  })
}

async function finish(confirmed) {
  if (!resolveConfirmation) return

  const resolve = resolveConfirmation
  resolveConfirmation = null
  visible.value = false
  await nextTick()
  previouslyFocused?.focus()
  resolve(confirmed)
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    finish(false)
    return
  }

  if (event.key !== 'Tab') return

  const focusable = dialog.value.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

defineExpose({ confirm })
</script>
