import axios from "axios";

// One axios instance shared by the whole app
const api = axios.create({
    baseURL: "http://localhost:5000/api",
});

// Runs before every request: attach the token if we have one
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;