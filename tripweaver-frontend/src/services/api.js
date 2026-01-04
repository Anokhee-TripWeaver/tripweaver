import axios from "axios";

const API_BASE_URL = "http://localhost:8090/api";

const API_AUTH = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
});

const API_GEMINI = axios.create({
  baseURL: `${API_BASE_URL}/gemini`,
});

export const signup = (userData) => API_AUTH.post("/signup", userData);
export const signin = (userData) => API_AUTH.post("/signin", userData);
export const generateItinerary = (data) => API_GEMINI.post("/generate", data);
