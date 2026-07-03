import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - add token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => {
        console.log(`Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('Authentication error, clearing token');
            localStorage.removeItem('jwt');
            delete api.defaults.headers.common['Authorization'];
            // You can redirect to login here if needed
        }
        return Promise.reject(error);
    }
);

export default api;