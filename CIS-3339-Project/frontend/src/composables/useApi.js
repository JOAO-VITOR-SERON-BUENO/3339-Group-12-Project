import { ref } from "vue";

// Reusable function for handling API requests
export function useApi(apiCall) {

  // Store the data received from the backend
  const data = ref(null);

  // Track whether the request is running
  const loading = ref(false);

  // Store an error message if something goes wrong
  const error = ref(null);

  // Execute or retry the API request
  const execute = async () => {
    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      data.value = await apiCall();
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Unable to complete the request";
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    execute,
  };
}