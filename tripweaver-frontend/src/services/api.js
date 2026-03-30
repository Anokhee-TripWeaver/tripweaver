import axios from "axios";
import API_BASE from "../config";

const API_BASE_URL = API_BASE;

const API_AUTH = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
});

const API_GEMINI = axios.create({
  baseURL: `${API_BASE_URL}/gemini`,
  withCredentials: true,
});

export const signup = (userData) => API_AUTH.post("/signup", userData);
export const signin = (userData) => API_AUTH.post("/signin", userData);
export const generateItinerary = (data) => API_GEMINI.post("/generate", data);
