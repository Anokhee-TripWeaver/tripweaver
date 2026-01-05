# 🌍 TripWeaver

> *Weaving your perfect journey, one destination at a time.* ✨

**TripWeaver** is a modern full‑stack travel planning and hotel listing application that helps users explore destinations and discover hotels effortlessly. The project is built with a clean architecture using **Spring Boot** for the backend and **React** for the frontend, focusing on scalability, clarity, and real‑world applicability.

---

## 🎯 Project Objective

The main goal of TripWeaver is to provide a centralized platform where users can:

* Explore travel destinations
* View and compare hotels
* Access well‑structured and reliable travel information

At the same time, the project demonstrates **full‑stack development concepts**, RESTful APIs, and database integration, making it suitable for academic and real‑world learning purposes.

---

## ✨ Key Features

### 👤 User Module

* Browse destinations and hotels
* View hotel details such as price, location, and ratings
* Search and filter hotels
* Clean and responsive user interface

### 🛠️ Admin / Management Module

* Add, update, and delete hotel records
* Manage destination data
* Backend validation and structured API responses

---

## 🧰 Technology Stack

### Frontend

* React.js
* Axios for API communication
* HTML5, CSS3, JavaScript

### Backend

* Java Spring Boot
* Spring Data JPA
* Hibernate ORM
* RESTful Web Services

### Database

* MySQL / H2 (configurable)

### Development Tools

* Git & GitHub
* Maven
* Postman for API testing

---

## 📁 Project Structure

```
TripWeaver/
│
├── backend/
│   ├── controller/   # REST controllers
│   ├── service/      # Business logic
│   ├── model/        # Entity classes
│   ├── repository/  # JPA repositories
│   └── TripWeaverApplication.java
│
├── frontend/
│   ├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Application pages
│   └── App.js
│
└── README.md
```

---

## 🔑 API Keys Configuration

This project uses multiple third-party APIs for enhanced travel features. Add the following keys in your backend configuration file (`application.properties` or `.env`):

```properties
geoapify.api.key=YOUR_GEOAPIFY_API_KEY
google.places.api.key=YOUR_GOOGLE_PLACES_API_KEY
gemini.api.key=YOUR_GEMINI_API_KEY
amadeus.api.key=YOUR_AMADEUS_API_KEY
amadeus.api.secret=YOUR_AMADEUS_API_SECRET
```

> ⚠️ **Note:** Never expose your API keys in public repositories. Always use environment variables or exclude configuration files using `.gitignore`.

---

## ⚙️ Installation & Setup

### 🔹 Backend Setup

1. Navigate to the backend directory

   ```bash
   cd backend
   ```
2. Configure the database in `application.properties`

   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/tripweaver
   spring.datasource.username=root
   spring.datasource.password=your_password
   ```
3. Run the Spring Boot application

   ```bash
   mvn spring-boot:run
   ```

📍 Backend runs on:

```
http://localhost:8080
```

---

### 🔹 Frontend Setup

1. Navigate to the frontend directory

   ```bash
   cd frontend
   ```
2. Install dependencies

   ```bash
   npm install
   ```
3. Start the React application

   ```bash
   npm start
   ```

📍 Frontend runs on:

```
http://localhost:3000
```

---

## 🔗 API Endpoints (Sample)

| Method | Endpoint     | Description          |
| ------ | ------------ | -------------------- |
| GET    | /hotels      | Fetch all hotels     |
| POST   | /hotels      | Add a new hotel      |
| PUT    | /hotels/{id} | Update hotel details |
| DELETE | /hotels/{id} | Remove a hotel       |

---

## 🧪 Testing

* Backend APIs tested using **Postman**
* Frontend tested through browser inspection and console debugging

---



## 🚀 Future Enhancements

* User authentication and role‑based access
* Hotel booking and payment integration
* User reviews and ratings
* AI‑based travel recommendations

---


## 📄 License

This project is developed for educational and learning purposes.

---

✨ *TripWeaver — Turning travel ideas into memorable journeys.* ✨
