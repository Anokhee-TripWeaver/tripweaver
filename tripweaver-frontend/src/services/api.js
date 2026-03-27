import axios from "axios";
import API_BASE from "../config";

const API_AUTH = axios.create({
  baseURL: `${API_BASE}/auth`,
});

const API_GEMINI = axios.create({
  baseURL: `${API_BASE}/gemini`,
});

export const signup = (userData) =>
  API_AUTH.post("/signup", userData, { withCredentials: true });

export const signin = (userData) =>
  API_AUTH.post("/signin", userData, { withCredentials: true });

export const generateItinerary = (data) =>
  API_GEMINI.post("/generate", data, { withCredentials: true });
