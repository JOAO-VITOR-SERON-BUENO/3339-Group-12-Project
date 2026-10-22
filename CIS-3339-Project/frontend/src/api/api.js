// This file contains all API calls to the API endpoints
import axios from "axios";
import { useAuthStore } from "@/store/loggedInUser";
import router from "@/router";

// Create HTTP client with the base URL and JSON content type
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_ROOT_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Restore token from localStorage on initialization if present (Task F1)[cite: 4, 5]
const savedToken = localStorage.getItem("authToken");
if (savedToken) {
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

// Centralized Axios response interceptor for error handling and 401 redirects
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the backend is unreachable
    if (!error.response) {
      return Promise.reject(new Error("Unable to reach the server"));
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized: clear session and redirect to login
    if (status === 401) {
      localStorage.removeItem("authToken");
      delete apiClient.defaults.headers.common["Authorization"];
      try {
        const authStore = useAuthStore();
        if (authStore && typeof authStore.clearSession === "function") {
          authStore.clearSession();
        }
      } catch (e) {
        // if store isn't initialized yet
      }
      if (router.currentRoute.value.name !== "Login") {
        router.push({ name: "Login" });
      }
    }

    // Extract an error message
    let errorMessage = "An unexpected error occurred";
    if (typeof data === "string") {
      errorMessage = data;
    } else if (data && data.message) {
      errorMessage = data.message;
    } else if (data && data.errors && data.errors.length > 0) {
      errorMessage = data.errors[0].msg;
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// Login related API calls
export async function loginUser(username, password) {
  const response = await apiClient.post("/users/login", {
    username,
    password,
  });
  const token = response.data.token;
  localStorage.setItem("authToken", token);
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  return token;
}

export function logoutUser() {
  localStorage.removeItem("authToken");
  delete apiClient.defaults.headers.common["Authorization"];
}

// Org related API calls
export async function getOrgName() {
  const response = await apiClient.get(`/org`);
  return response.data;
}

// Events related API calls
export const getEvents = async () => {
  const response = await apiClient.get("/events/");
  return response.data;
};

export const getEventById = async (id) => {
  const response = await apiClient.get(`/events/id/${id}`);
  return response.data;
};

export const searchEvents = async (query) => {
  let params = {};
  if (query.searchBy === "name") {
    params.searchBy = query.searchBy;
    params.name = query.name || "";
  } else if (query.searchBy === "date") {
    params.searchBy = "date";
    params.eventDate = query.eventDate || "";
  }
  const response = await apiClient.get(`/events/search`, { params });
  return response.data;
};

export const getClientEvents = async (id) => {
  const response = await apiClient.get(`/events/client/${id}`);
  return response.data;
};

export const getNonClientEvents = async (id) => {
  const response = await apiClient.get(`/events/client/${id}/not-registered`);
  return response.data;
};

export const getEventAttendees = async (id) => {
  const response = await apiClient.get(`/events/attendees/${id}`);
  return response.data;
};

export const getEventsByServiceId = async (id) => {
  const response = await apiClient.get(`/events/service/${id}`);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await apiClient.post("/events/", eventData);
  return response.data;
};

export const updateEvent = async (id, eventData) => {
  const response = await apiClient.put(`/events/update/${id}`, eventData);
  return response.data;
};

export const registerAttendee = async (eventId, clientId) => {
  const response = await apiClient.put(
    `/events/register`,
    {},
    {
      params: { event: eventId, client: clientId },
    }
  );
  return response.data;
};

export const deregisterAttendee = async (eventId, clientId) => {
  const response = await apiClient.put(
    `/events/deregister`,
    {},
    {
      params: { event: eventId, client: clientId },
    }
  );
  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await apiClient.delete(`/events/${id}`);
  return response.data;
};

export const getAttendance = async () => {
  const response = await apiClient.get("/events/attendance");
  return response.data;
};

// Clients related API calls
export const getClients = async () => {
  const response = await apiClient.get("clients");
  return response.data;
};

export const getClientById = async (id) => {
  const response = await apiClient.get(`/clients/id/${id}`);
  return response.data;
};

export const searchClients = async (query) => {
  let params = {};
  if (query.searchBy === "name") {
    params.searchBy = query.searchBy;
    params.firstName = query.firstName || "";
    params.lastName = query.lastName || "";
  } else if (query.searchBy === "number") {
    params.searchBy = query.searchBy;
    params.phoneNumber = query.phoneNumber || "";
  }
  const response = await apiClient.get("/clients/search", { params });
  return response.data;
};

export const createClient = async (newClient) => {
  const response = await apiClient.post("/clients", newClient);
  return response.data;
};

export const updateClient = async (id, updatedClient) => {
  const response = await apiClient.put(`/clients/update/${id}`, updatedClient);
  return response.data;
};

export const deleteClientbyId = async (id) => {
  const response = await apiClient.delete(`/clients/${id}`);
  return response.data;
};

export const getClientsByZipCode = async () => {
  const response = await apiClient.get("/clients/byzip");
  return response.data;
};

// Services related API calls
export const getServices = async () => {
  const response = await apiClient.get("/services/");
  return response.data;
};

export const getServiceById = async (id) => {
  const response = await apiClient.get(`/services/id/${id}`);
  return response.data;
};

export const searchServices = async (query) => {
  let params = {};
  params.searchBy = query.searchBy;
  if (query.searchBy === "name") {
    params.name = query.name || "";
  } else if (query.searchBy === "description") {
    params.description = query.description;
  }
  const response = await apiClient.get("/services/search", { params });
  return response.data;
};

export const createService = async (newService) => {
  const response = await apiClient.post("/services", newService);
  return response.data;
};

export const updateService = async (id, updatedService) => {
  const response = await apiClient.put(`/services/update/${id}`, updatedService);
  return response.data;
};

export const deleteService = async (id) => {
  const response = await apiClient.delete(`/services/${id}`);
  return response.data;
};

export default apiClient;