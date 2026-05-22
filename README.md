# CineCraftClub (C3) 🎬

CineCraftClub (C3) is a modern, full-stack collaborative platform and social workspace designed for cinema enthusiasts. It allows users to join specialized discussion groups centered around specific movies or TV shows, participate in real-time chat, analyze trending discussion keywords, rate and review movies, and manage custom watchlists.

---

## 🚀 Features

### 1. Dynamic 3-Panel Chat Workspace
* **Left Sidebar**: Displays the list of groups the authenticated user is currently a member of, with custom thumbnails and quick navigation shortcuts.
* **Central Chat Pane**: A real-time chat feed polling messages and reaction updates. Hovering over any message exposes a quick-emoji reaction tray.
* **Right Sidebar (Movie Info & Members)**: Displays context-aware media details fetched from TMDB (such as overview, vote averages, runtime, and release date) and a list of active group members.
* **Resizable Splits**: Built using custom React resizable panels, allowing users to collapse or expand sidebars to customize their chat space.

### 2. Natural Language Processing (NLP) Keyword Analyzer
* Extrates the top 10 trending words from recent group messages using a custom stopword filtering algorithm.
* Supports **English and Telugu stopwords** (e.g., filtering out common Telugu words like *undi, chala, bagundi, ela, emiti* and common English words).
* Stores serialized keywords directly in PostgreSQL JSONB fields with a 1-hour temporal caching strategy to prevent database calculation overhead on every message send.

### 3. Ratings & Movie Reviews
* Allows users to rate films (1 to 10 stars) and submit text reviews directly from a modal popup.
* Users can view, update, and manage their ratings history from a personalized section in the User Dashboard.

### 4. Interactive Watchlist Management
* Add movies/TV shows to a personal watchlist with optimistic UI updates.
* Toggle watched/unwatched status which instantly re-sorts items (unwatched titles prioritized at the top).

### 5. Multi-Mode Security & Authentication
* **JWT Stateless Sessions**: Restricts API access using a stateless verification filter (`JwtAuthenticationFilter`) that parses authorization headers.
* **Google OAuth2 Login**: Facilitates social login using `CustomOAuth2UserService` and automatically generates username profiles, links matching emails, and handles redirects with secure token query dispatching.

---

## 🛠️ Tech Stack

### Backend
* **Language & Framework**: Java 17, Spring Boot 4.x
* **Security**: Spring Security (JWT + OAuth2 Client)
* **Database**: PostgreSQL (JPA/Hibernate)
* **Migrations**: Flyway (8 versioned migrations)
* **Build Tool**: Maven

### Frontend
* **Core Library**: React.js (with TypeScript)
* **Build tool**: Vite
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Network client**: Axios

---

## 📂 Project Structure

```
C3/
├── backend/
│   ├── src/main/java/com/c3/backend/
│   │   ├── controller/      # REST API Endpoints (Auth, Groups, Ratings, Watchlists)
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── model/           # JPA Entities (User, MovieGroup, WatchlistItem, etc.)
│   │   ├── repository/      # Spring Data JPA repositories
│   │   ├── security/        # JWT Filter, SecurityConfig, and OAuth2 handlers
│   │   └── service/         # Business logic & KeywordAnalyzer service
│   └── src/main/resources/db/migration/ # Flyway SQL schema files (V1 to V8)
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── groups/      # CreateGroupModal, MovieInfoPanel, TrendingKeywords
    │   │   ├── layout/      # Navbar, Footer, RootLayout
    │   │   ├── movie/       # MovieCard, RatingModal, WatchlistListItem
    │   │   └── ui/          # Resizable split panels
    │   ├── pages/           # Explore, GroupsPage, Home, MovieDetails, UserDashboard
    │   └── services/        # TMDB and API clients
    └── package.json
```

---

## ⚙️ Setup & Installation

### Prerequisites
* Java 17
* Maven 3.x
* Node.js (v18+) & npm
* PostgreSQL database instance running

### Backend Setup
1. Configure your database connection details and TMDB API key in `backend/src/main/resources/application-local.properties` (or setup your system environment variables).
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/c3
   spring.datasource.username=postgres
   spring.datasource.password=yourpassword
   tmdb.api.key=your_tmdb_api_key
   ```
2. Navigate to the `backend` directory and build the project using Maven:
   ```bash
   cd backend
   mvn clean install
   ```
3. Run the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   *The server will run on [http://localhost:8080](http://localhost:8080).*

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on [http://localhost:5173](http://localhost:5173).*
