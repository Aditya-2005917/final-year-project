import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach token
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle banned accounts cleanly
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const msg = (error.response?.data?.error || "").toLowerCase();

      if (
        msg.includes("suspended") ||
        msg.includes("banned") ||
        msg.includes("account has been")
      ) {
        if (!sessionStorage.getItem("ban_handled")) {
          sessionStorage.setItem("ban_handled", "true");
          
          sessionStorage.clear();
          
          toast.error("Your account has been suspended. Please contact support.", {
            duration: 4000,
            id: "account-suspended",   
          });

          setTimeout(() => {
            window.location.href = "/auth";
          }, 1500);
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default API;