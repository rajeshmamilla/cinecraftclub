# CineCraftClub (C3) 🎬

CineCraftClub (C3) is a modern, production-ready, full-stack collaborative platform and social workspace designed for cinema enthusiasts. It allows users to join specialized, craft-focused discussion groups centered around specific movies or TV shows (Directing, Screenwriting, Editing, acting, etc.), participate in real-time chat, analyze trending discussion keywords, rate and review movies, and manage custom watchlists.

---

## 🔗 Live Deployments

* **Live Demo (Frontend)**: [https://cinecraftclub.vercel.app](https://cinecraftclub.vercel.app) *(or add your link here)*
* **Production API (Backend)**: [https://cinecraftclub.onrender.com](https://cinecraftclub.onrender.com) *(or add your link here)*

---

## 🚀 Key Features

### 1. Dynamic 3-Panel Chat Workspace
* **Left Sidebar**: Displays the list of groups the authenticated user is currently a member of, with custom thumbnails, unread indicators, and quick navigation shortcuts.
* **Central Chat Pane**: A real-time chat feed with message log scrolling, message deleting/unsending (instant, zero-latency), and quick hover-emoji reaction trays.
* **Right Sidebar (Movie Info & Members)**: Displays context-aware media details fetched from TMDB (overview, runtime, release date, and C3 ratings) and the active group member directory.
* **Resizable Splits**: Built using custom React split-panes, allowing users to collapse or expand sidebars to customize their chat space.

### 2. Natural Language Processing (NLP) Keyword Analyzer
* Extracts the top 10 trending words from recent group messages using a custom stopword filtering algorithm.
* Supports **English and Telugu stopwords** (e.g., filtering out common Telugu words like *undi, chala, bagundi, ela, emiti* and common English words).
* Stores serialized keywords directly in PostgreSQL JSONB fields with a 1-hour temporal caching strategy to prevent database calculation overhead on every message send.

### 3. Ratings & Movie Reviews
* Allows users to rate films (1 to 10 stars) and submit text reviews directly from a modal popup.
* Users can view, update, and manage their ratings history from a personalized section in the User Dashboard.

### 4. Interactive Watchlist Management
* Add movies/TV shows to a personal watchlist with optimistic UI updates (instant icon toggle and toast alert with background REST call verification).
* Toggle watched/unwatched status which instantly re-sorts items (unwatched titles prioritized at the top).

### 5. Multi-Mode Security & Access Control
* **JWT Stateless Sessions**: Restricts API access using a stateless verification filter (`JwtAuthenticationFilter`) that parses authorization headers.
* **Google OAuth2 Login**: Facilitates social login using `CustomOAuth2UserService` and automatically generates username profiles, links matching emails, and handles redirects with secure token query dispatching.
* **Private Group Authorization**: Hides member lists, description items, invite actions, and message feeds for non-members, displaying a premium lockout lock screen instead.

### 6. Aggregated Notifications & Real-Time Tab Sync
* A navbar notification icon badge tracking aggregated notifications: `(pending join requests where user is admin) + (groups with unread messages)`.
* Employs React hooks, `localStorage` read count comparisons, and custom DOM storage event dispatchers (`window.dispatchEvent(new Event('storage'))`) to sync unread counts across all active browser tabs instantly.

### 7. Resilient Network Error Fallbacks
* Includes a client-side network error fallback page to handle local DNS/ISP blocks (`ERR_CONNECTION_CLOSED` or connection drops) when fetching details from TMDB, offering troubleshooting tips (VPN recommendation) and retry triggers.

---

## 📸 Screenshots

*(Place your screenshots here, e.g., `![CineCraftClub Homepage](./screenshots/home.png)`)*

---

## 🛠️ Tech Stack

### Backend
* **Language & Framework**: Java 17, Spring Boot 4.x
* **Security**: Spring Security (JWT + OAuth2 Client)
* **Database**: PostgreSQL (JPA/Hibernate)
* **Migrations**: Flyway (10 versioned SQL migrations)
* **Build Tool**: Maven

### Frontend
* **Core Library**: React.js (with TypeScript)
* **Build Tool**: Vite
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Network Client**: Axios
* **Toasts**: Sonner

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
│   └── src/main/resources/db/migration/ # Flyway SQL schema files (V1 to V10)
│
66: └── frontend/
67:     ├── src/
68:     │   ├── components/
69:     │   │   ├── groups/      # CreateGroupModal, MovieInfoPanel, TrendingKeywords
70:     │   │   ├── layout/      # Navbar, Footer, RootLayout
71:     │   │   ├── movie/       # MovieCard, RatingModal, WatchlistListItem
72:     │   │   └── ui/          # Resizable split panels
73:     │   ├── pages/           # Explore, GroupsPage, Home, MovieDetails, UserDashboard
74:     │   └── services/        # TMDB and API clients
75:     └── package.json
```

---

## ⚙️ Setup & Installation

### Prerequisites
* Java 17 or higher
* Node.js (v18+) & npm
* PostgreSQL database instance running locally or on the cloud

### Backend Setup
1. Create a PostgreSQL database (e.g., `c3` or `neondb`).
2. Configure your database connection details and TMDB API key in `backend/src/main/resources/application-local.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/c3
   spring.datasource.username=postgres
   spring.datasource.password=yourpassword
   tmdb.api.key=your_tmdb_api_key
   ```
3. Navigate to the `backend` directory and build the project using Maven:
   ```bash
   cd backend
   ./mvnw clean install
   ```
4. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
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
