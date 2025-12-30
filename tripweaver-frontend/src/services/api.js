    import axios from "axios";

    const API = axios.create({
      baseURL: "http://localhost:8080/api/auth", // backend URL
    });

    export const signup = (userData) => API.post("/signup", userData);
    export const signin = (userData) => API.post("/signin", userData);
