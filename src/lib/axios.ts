
import axios from 'axios';
import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add the auth token to every request
axiosInstance.interceptors.request.use(
  async (config) => {
    // Ensure we're running in the browser before accessing currentUser
    if (typeof window !== "undefined") {
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.error('Could not get Firebase ID token.', error);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    } else if (error.request) {
      console.error("API No Response:", error.request);
    } else {
      console.error("API Error Message:", error.message);
    }
    return Promise.reject(error);
  }
)

export default axiosInstance;
