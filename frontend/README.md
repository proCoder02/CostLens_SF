# CostLens Frontend

React + Vite + Tailwind CSS frontend for the CostLens API monitoring dashboard.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (proxies /api to localhost:8000)
npm run dev

# Production build
npm run build
npm run preview
```

## Project Structure

```
src/
├── api/                    # API client modules (axios)
│   ├── client.js           #   Axios instance with JWT interceptors
│   ├── auth.js             #   Register, login, getMe
│   ├── dashboard.js        #   Dashboard summary
│   ├── connections.js      #   Provider connection CRUD
│   ├── usage.js            #   Usage ingest & endpoint queries
│   ├── alerts.js           #   Alert list, mark read, trigger
│   ├── insights.js         #   Optimization recommendations
│   └── settings.js         #   Budgets & alert preferences
├── components/
│   ├── DashboardLayout.jsx #   Sidebar nav + page shell
│   ├── ProtectedRoute.jsx  #   Auth guard wrapper
│   ├── Spinner.jsx         #   Loading, error, empty states
│   └── Toast.jsx           #   Toast notification system
├── context/
│   └── AuthContext.jsx     #   Auth state (login/register/logout)
├── hooks/
│   └── useApi.js           #   Data-fetching & mutation hooks
├── pages/
│   ├── LandingPage.jsx     #   Marketing page (hero, features, pricing)
│   ├── LoginPage.jsx       #   Login form
│   ├── RegisterPage.jsx    #   Registration form
│   ├── DashboardPage.jsx   #   Charts, summary cards, top endpoints
│   ├── EndpointsPage.jsx   #   Sortable endpoint cost table
│   ├── AlertsPage.jsx      #   Alert feed with severity filters
│   ├── InsightsPage.jsx    #   Optimization recommendations
│   ├── SettingsPage.jsx    #   Connections, budgets, preferences
│   └── NotFoundPage.jsx    #   404 fallback
├── styles/
│   └── globals.css         #   Tailwind directives + component classes
├── utils/
│   └── format.js           #   Currency, number, time formatters
├── App.jsx                 #   Router configuration
└── main.jsx                #   React entry point
```

## Environment Variables

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Tech Stack

- **React 18** — UI library
- **React Router 6** — client-side routing
- **Tailwind CSS 3** — utility-first styling
- **Recharts** — chart components
- **Axios** — HTTP client with interceptors
- **Lucide React** — icon library
- **Vite 5** — build tool

## Pages

| Route              | Page          | Auth   | Description                       |
|--------------------|---------------|--------|-----------------------------------|
| `/`                | Landing       | Public | Marketing page with pricing       |
| `/login`           | Login         | Public | Email/password login form         |
| `/register`        | Register      | Public | Account creation form             |
| `/app`             | Dashboard     | Auth   | Cost charts & summary cards       |
| `/app/endpoints`   | Endpoints     | Auth   | Per-endpoint cost breakdown       |
| `/app/alerts`      | Alerts        | Auth   | Alert feed with severity filters  |
| `/app/insights`    | Insights      | Auth   | Optimization recommendations      |
| `/app/settings`    | Settings      | Auth   | Connections, budgets, preferences |
