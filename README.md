# 3339-Group-12-Project

**Data Platform**, the CIS 4339 course project for Group 12. It is a web app that a community
organization uses to manage its clients, services, and events, and to view attendance and
client-by-zip-code dashboards.

| Part | Stack | Location | Details |
| --- | --- | --- | --- |
| Frontend | Vue 3 (`<script setup>`), Vite 8, Tailwind CSS 4, Pinia, Vue Router, Axios, Chart.js | [`CIS-3339-Project/frontend`](CIS-3339-Project/frontend) | [Frontend README](CIS-3339-Project/frontend/README.md) |
| Backend | Node.js, Express, Mongoose, MongoDB | [`CIS-3339-Project/backend`](CIS-3339-Project/backend) | [Backend README](CIS-3339-Project/backend/README.md) |

The course requirements are in [`CIS-3339-Project/Project-README.md`](CIS-3339-Project/Project-README.md).

The current sprint covers the **frontend only**; backend work is planned for a later sprint (see
[Backend](#backend)).

## Architecture

```mermaid
flowchart LR
  B["Browser<br/>Vue 3 SPA (frontend/dist)"] -- "JSON over HTTP(S)<br/>Authorization: Bearer &lt;JWT&gt;" --> A["Express API<br/>(VITE_ROOT_API)"]
  A --> D[("MongoDB")]
```

- The frontend is a static single-page app. Every API call goes through one Axios client
  (`frontend/src/api/api.js`), which reads its base URL from `VITE_ROOT_API`, attaches the JWT, and turns
  error responses into readable messages. A `401` response logs the user out.
- After login, the JWT is stored in `localStorage` and the session is restored on page reload. Editor-only
  pages (`/clientform`, `/eventform`, `/serviceform`) are guarded by role.

## Prerequisites

- **Node.js 22.12+ or 24 LTS** (verified with Node 24.20.0 and npm 11.19.0)
  - Building needs `^20.19.0 || >=22.12.0` (Vite 8).
  - Running the tests needs `^22.12.0 || ^24 || >=26` (Vitest 5).
- **npm**, which ships with Node.js.
- A running backend API for data and login. Without one, the frontend still loads and shows
  "Unable to reach the server".

## Quick start

```bash
cd CIS-3339-Project/frontend
npm install
npm run dev        # http://localhost:5173
```

## Configuration

`CIS-3339-Project/frontend/.env` is **committed on purpose** (a course requirement for reproducible grading):

| Variable | Purpose |
| --- | --- |
| `VITE_ROOT_API` | Backend base URL (`http://localhost:3000`). It is embedded into the bundle at build time, so rebuild after changing it. Put personal overrides in `frontend/.env.local`, which is git-ignored. |

## Build, preview, and test

```bash
cd CIS-3339-Project/frontend
npm run build      # production bundle in frontend/dist
npm run preview    # serve the production build at http://localhost:4173
npx vitest run     # unit tests (useApi composable)
```

## Deployment (frontend)

**Hosting used:** GitHub Pages, at https://joao-vitor-seron-bueno.github.io/3339-Group-12-Project/

- The workflow [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) tests and
  builds the frontend on every push or pull request to `dev` or `main` that changes
  `CIS-3339-Project/frontend/`. It publishes to Pages only from `main`. You can also run it by hand from the
  *Actions* tab.
- **One-time setup** (a repository admin): *Settings > Pages > Build and deployment > Source:*
  **GitHub Actions**. The site goes live after that and the first successful run.
- The workflow builds with `BASE_PATH=/3339-Group-12-Project/` (Pages serves project sites from
  `/<repo>/`). It also copies `index.html` to `404.html` as the SPA fallback, so refreshing a nested route
  such as `/clientdetails/<id>` works.
- To point the site at a hosted backend later, set the repository variable `VITE_ROOT_API` (HTTPS URL) and
  re-run the workflow.

Details and settings for other hosts are in the
[Frontend README](CIS-3339-Project/frontend/README.md#deployment-github-pages).

## Backend

The backend is **out of scope for the current sprint** and has not been changed. To run it locally, follow
the [Backend README](CIS-3339-Project/backend/README.md). It needs a MongoDB database containing an
organization and users, and the configuration in `CIS-3339-Project/backend/.env`.

## Team

| Member | Sprint 2 responsibility |
| --- | --- |
| Diego Gonzalez | F1 (`App.vue`, dashboard, chart components) and D2 (production build, deployment docs) |
| Long Tran | F1 (CRUD views, forms, detail pages, login) |
| Joao Vitor Seron Bueno | F2 (`useApi()` composable, centralized Axios error handling) |
| Alex | F4 (session restoration, router guards, editor-only routes) |
| Krishna | F3 / C2 / C3 (reusable components: SearchBar, ConfirmationModal) |

## Known limitations

- **The GitHub Pages site needs the one-time Pages setup above.** Until a backend is hosted, it loads but
  shows "Unable to reach the server" for data and login.
- Backend work (database initialization, server-side role checks and organization isolation, event
  registration rules) is planned for a later sprint.
- Role checks in the frontend are UX only; the backend must enforce them.
- On GitHub Pages, a direct visit or refresh of a nested route returns HTTP 404 (via `404.html`), even
  though the page renders correctly.
