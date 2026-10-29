# Data Platform Frontend

This project uses [VueJS 3](https://vuejs.org/) with [Vite](https://vitejs.dev/) and [TailwindCSS](https://tailwindcss.com/).
For form validation [Vuelidate](https://vuelidate-next.netlify.app/) is used.

State management is done via [Pinia](https://pinia.vuejs.org/).

The frontend is a single-page application (SPA). `npm run build` produces a static bundle in
`frontend/dist` that can be served by any static web host, as long as the host is configured with
an SPA fallback (see [SPA fallback](#spa-fallback-required-for-static-hosting)).

## Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0` to build (Vite 8's requirement). Running the tests needs
  `^22.12.0`, `^24`, or `>=26` (Vitest 5's requirement), so **Node 22.12+ or 24 LTS** is recommended.
  The production build was verified with **Node.js 24.20.0** and **npm 11.19.0** on macOS.
- **npm** (ships with Node.js).
- A running **backend API** - either a local instance (see `../backend/README.md`) or a cloud-deployed
  one. The frontend only needs its URL.

All commands below are run from the `frontend` directory.

## Project setup

    cd frontend
    npm install

## Environment configuration

The frontend reads exactly one variable:

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_ROOT_API` | Base URL of the backend API, used by the Axios client in `src/api/api.js` (no trailing slash) | `http://localhost:3000` |

- `frontend/.env` is **committed** with the grading configuration (`VITE_ROOT_API=http://localhost:3000`),
  as required by the course project guidelines.
- To point your own machine at a different backend without changing the committed file, create
  `frontend/.env.local` (git-ignored) - `.env.example` is a template. Values in `.env.local` override `.env`.
- `VITE_ROOT_API` is **embedded into the JavaScript bundle at build time**. Changing it requires a rebuild;
  editing `.env` on the server after deployment has no effect.
- Every `VITE_*` variable ends up in the public bundle. Never put secrets in the frontend `.env`.
- If `VITE_ROOT_API` is missing, `npm run build` prints a warning. The build still completes, but every API
  request would go to the frontend's own host and fail.

The API URL is not hard-coded anywhere in `src/`; the only place it is read is
`import.meta.env.VITE_ROOT_API` in `src/api/api.js`.

## Development

Compiles and hot-reloads for development (default: http://localhost:5173):

    npm run dev

`npm start` is an alias for the same command.

## Production build

    npm run build

Output is written to `frontend/dist` (`index.html`, `favicon.ico`, and hashed files in `dist/assets/`).
`dist/` is git-ignored - it is a build artifact, not source.

## Preview the production build locally

    npm run preview

This serves `frontend/dist` at http://localhost:4173 (`npm run serve` is an alias). Run `npm run build`
first - preview serves whatever is currently in `dist`. `vite preview` already applies the SPA fallback,
so refreshing a nested route such as `/clientdetails/<id>` works locally.

The final demo should run against this production build, not the dev server.

## SPA fallback (required for static hosting)

The router uses HTML5 history mode (`createWebHistory(import.meta.env.BASE_URL)`), so URLs look like `/clientdetails/123`
rather than `/#/clientdetails/123`. Those paths do not exist as files in `dist/`. When a user refreshes
or opens such a URL directly, the host must respond with `dist/index.html` (and status 200) instead of
a 404, so that Vue Router can resolve the route in the browser.

Configure a rewrite of **all unknown paths to `/index.html`** on whichever host is used. Real files in
`dist/assets/` must still be served as-is. Examples for common hosts:

**Netlify** - add `public/_redirects` (Vite copies it into `dist/`):

    /*    /index.html   200

**Vercel** - add `vercel.json` in the frontend directory:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Render (Static Site)** - under *Redirects/Rewrites* add: Source `/*`, Destination `/index.html`,
Action `Rewrite`.

**nginx**:

```nginx
location / {
  root /path/to/dist;
  try_files $uri $uri/ /index.html;
}
```

**Apache** - `.htaccess` in the document root (requires `mod_rewrite`):

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**GitHub Pages** (the host this project uses) has no rewrite rules. Instead, the deploy workflow copies
`index.html` to `404.html`, which Pages serves for any unknown path. The app loads and Vue Router shows the
right page, but the HTTP status of that first response is 404. No other host files are committed.

## Backend URL and CORS

- The browser calls the backend **directly** at `VITE_ROOT_API`, so the frontend and backend are usually
  on different origins and the backend must allow cross-origin requests.
- The backend currently enables CORS for every origin (`cors({ origin: '*' })` in `backend/app.js`).
  That works because the frontend authenticates with an `Authorization: Bearer <token>` header, not cookies.
- If the backend is changed to restrict CORS to a specific origin (for example a `CORS_ORIGIN` variable),
  that value must be the **exact origin of the deployed frontend** - scheme, host, and port, with no path
  or trailing slash (e.g. `https://my-frontend.example.com`, or `http://localhost:4173` for `npm run preview`,
  `http://localhost:5173` for `npm run dev`). The `Authorization` and `Content-Type` request headers must be
  allowed.
- A frontend served over **HTTPS** must use an **HTTPS** backend URL; browsers block HTTP API calls from an
  HTTPS page (mixed content).

## Deployment (GitHub Pages)

**Hosting used:** GitHub Pages, deployed by the GitHub Actions workflow
[`.github/workflows/deploy-frontend.yml`](../../.github/workflows/deploy-frontend.yml).

Site URL: https://joao-vitor-seron-bueno.github.io/3339-Group-12-Project/ (live after the setup below and
the first successful run).

**One-time setup** (a repository admin): *Settings > Pages > Build and deployment > Source:*
**GitHub Actions**.

**How it deploys:** every push or pull request to `dev` or `main` that changes `CIS-3339-Project/frontend/`
(or the workflow) runs the workflow. On `dev` and on pull requests, it only tests and builds, as a CI check.
A push to `main` also publishes the site; Pages accepts deployments only from the default branch. You can
also start it by hand from the *Actions* tab (*Deploy frontend to GitHub Pages > Run workflow*). The
workflow:

1. runs `npm ci` and the unit tests (`npx vitest run`) with Node 24;
2. builds with `BASE_PATH=/3339-Group-12-Project/`. A project site is served from `/<repo>/`, so
   `vite.config.mjs` uses this as Vite's `base`, and the router picks it up through
   `import.meta.env.BASE_URL`. Local builds keep `base` at `/`;
3. copies `dist/index.html` to `dist/404.html` for the SPA fallback (see above);
4. on `main` only, uploads `dist/` and publishes it to Pages.

**Backend URL:** the build uses the committed `frontend/.env` (`http://localhost:3000`). To point the
deployed site at a hosted backend, add a repository variable `VITE_ROOT_API` (*Settings > Secrets and
variables > Actions > Variables*) with its HTTPS URL, and re-run the workflow. Pages is served over HTTPS, so
a hosted backend must use HTTPS too, and its CORS policy must allow `https://joao-vitor-seron-bueno.github.io`.

**Checking a deployment:** open the site, log in, and refresh a nested route such as
`/3339-Group-12-Project/clientdetails/<id>`. In the browser's network tab, confirm that API requests go to
the backend URL.

**Other static hosts:** set the root directory to `CIS-3339-Project/frontend`, the build command to
`npm ci && npm run build`, and the publish directory to `dist`. Set `VITE_ROOT_API`, and configure the SPA
fallback rewrite for that host (examples above). Leave `BASE_PATH` unset when the site is served from the
domain root.

## Verification performed (Sprint 2, D2)

On macOS with Node 24.20.0:

- `npm install`, `npm run build` (Vite 8) - succeeds (118 modules, no unresolved imports, no warnings).
- The build also succeeds on a **case-sensitive** filesystem (a case-sensitive APFS volume, approximating
  Linux and most CI/hosting builders). This required fixing an import whose casing did not match the
  file name (`eventdetails.vue` vs `eventDetails.vue`), which builds on macOS/Windows but fails on Linux.
- `npm run preview` - `/`, `/login`, `/findclient`, `/eventdetails/<id>`, `/clientdetails/<id>`, and
  `/servicedetails/<id>` all return the app, and all built assets load.
- In headless Chrome against the production build, the dashboard called `http://localhost:3000` (the
  configured `VITE_ROOT_API`) for `/org`, `/events/attendance`, and `/clients/byzip`, and rendered the tables
  and both charts. A mock API with sample data was used here, not the real backend/database.
- **GitHub Pages build**, emulated locally: built with `BASE_PATH=/3339-Group-12-Project/` plus the `404.html`
  copy, and served by a local server that mimics Pages (`/<repo>/` prefix; unknown paths return `404.html`).
  In headless Chrome, the login page, dashboard, `/clientdetails/<id>` (refreshed directly), and the 404 page
  all rendered with no console errors. All asset URLs and nav links carried the `/3339-Group-12-Project/`
  prefix.

Not yet verified: the production build against the real backend and database, full logged-in CRUD flows,
a native Windows or Linux build, and the live GitHub Pages deployment (it needs Pages enabled and the
workflow merged to `main`).

## Tests

Unit tests for the `useApi` composable use [Vitest](https://vitest.dev/):

    npx vitest run

## Known limitations

- **The GitHub Pages site depends on one-time setup.** It goes live only after a repository admin sets
  Pages' source to GitHub Actions and the workflow runs on `main`.
- **The deployed site has no hosted backend yet.** With the committed `VITE_ROOT_API=http://localhost:3000`,
  the site can only reach a backend running on the visitor's own machine. Otherwise it shows "Unable to
  reach the server".
- **On GitHub Pages, a direct visit or refresh of a nested route returns HTTP 404** (via `404.html`), even
  though the page renders correctly. Pages has no real rewrites.
- **Sub-path hosting is controlled by `BASE_PATH`** at build time. It defaults to `/`; the Pages workflow
  sets `/3339-Group-12-Project/`.
- **`VITE_ROOT_API` is fixed at build time** - one build targets exactly one backend.
- **The session is stored in `localStorage`** (JWT) and restored on page load; an expired or malformed token
  is discarded, and any `401` response logs the user out. Role checks in the frontend are UX only - the
  backend must enforce them.
- The dashboard chunk is about 209 KB (71 KB gzipped), mostly Chart.js.
