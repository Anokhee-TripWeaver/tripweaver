const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:8090";
const API_BASE = process.env.REACT_APP_API_BASE || `${API_ORIGIN}/api`;

export const ENABLE_BACKEND_STATUS_CHECK =
  process.env.REACT_APP_ENABLE_BACKEND_STATUS_CHECK === "true";

export const LOGOUT_URL = `${API_ORIGIN}/logout`;

export default API_BASE;
