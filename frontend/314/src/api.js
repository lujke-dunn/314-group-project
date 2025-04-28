// api.js
import axios from 'axios';

// Set the base URL for all requests
axios.defaults.baseURL = 'http://localhost:8080'; // Change this to match your backend URL

// Add a response interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    // Handle common errors here
    if (error.response?.status === 401) {
      // Unauthorized, clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axios;