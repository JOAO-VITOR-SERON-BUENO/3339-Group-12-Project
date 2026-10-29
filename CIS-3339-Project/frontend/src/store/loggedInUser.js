// This pinia store contains state with respect to whether a user is logged in 
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import { loginUser, logoutUser } from '../api/api' // import API calls
import jwt_decode from 'jwt-decode'; // import JSON Web Token decoder to decode the token into the user's information

//Notifications
const toast = useToast()

// Helper to check token validity and expiration on startup
function getValidDecodedToken() {
  const token = localStorage.getItem("authToken");
  if (!token) return null;
  try {
    const decoded = jwt_decode(token);
    // Check if token has expired (exp is in seconds, Date.now() in milliseconds)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      localStorage.removeItem("authToken");
      return null;
    }
    return decoded;
  } catch (e) {
    localStorage.removeItem("authToken");
    return null;
  }
}

// Pre-load decoded token state on initialization
const initialDecoded = getValidDecodedToken();

// Defining a store
export const useLoggedInUserStore = defineStore({
  id: 'loggedInUser',
  state: () => {
    // restore the session from a valid saved token so a page refresh keeps the user logged in
    return {
      name: initialDecoded?.name || "",
      role: initialDecoded?.role || "",
      isLoggedIn: !!initialDecoded
    }
  },
  actions: {
    async login(username, password) {
      try {
        const token = await loginUser(username, password);
        // Get the user's name and role from the JWT token
        const decodedToken = jwt_decode(token);
        this.$patch({
          isLoggedIn: true,
          role: decodedToken.role,
          name: decodedToken.name
        });
        this.$router.push("/");
        toast.success("Login Sucessful!")

      } catch ( error ) {
        toast.error(error.message)
      }
    },
    logout() {
      logoutUser();
      // Reset value after user log out
      this.$patch({
        name: "",
        role: "",
        isLoggedIn: false
      });
      this.$router.push("/");
      toast.info("You have been logged out!")
    }
  },
});
