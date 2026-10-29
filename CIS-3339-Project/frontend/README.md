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

None of these host-specific files are committed yet, because no host has been chosen. Add only the one
for the host the team actually uses.

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

## Deployment steps

1. Deploy the backend and note its public URL (e.g. `https://<your-backend-host>`).
2. Set `VITE_ROOT_API` to that URL - in the host's build environment variables if the host builds the app,
   or in `frontend/.env.local` if you build locally and upload `dist/`.
3. Build:

       cd frontend
       npm install
       npm run build

   Most hosts that build for you need: base/root directory `CIS-3339-Project/frontend`, build command
   `npm install && npm run build` (or `npm ci && npm run build`), publish directory `dist`.
4. Configure the SPA fallback for the host (see above).
5. Make sure the backend's CORS policy allows the frontend's origin (see above).
6. Verify the deployed site: open it, log in, then refresh a nested route such as `/clientdetails/<id>`.
   Check the browser's network tab that API requests go to the backend URL, not to the frontend host.

**Hosting used:** *TBD - not deployed yet. Once deployed, record the host, build settings, and URLs here.*

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

Not yet verified: the production build against the real backend and database, full logged-in CRUD flows,
a native Windows or Linux build, and an actual deployment.

## Tests

Unit tests for the `useApi` composable use [Vitest](https://vitest.dev/):

    npx vitest run

## Known limitations

- **Not deployed yet** - there is no public URL, and the hosting section above is still TBD.
- **Served from the domain root by default.** Vite's `base` is the default `/`. Hosting under a sub-path
  (e.g. `https://host/app/`) requires setting `base: '/app/'` in `vite.config.mjs`; the router already reads
  it through `import.meta.env.BASE_URL`, and the SPA fallback must then rewrite to `/app/index.html`.
- **GitHub Pages** does not support rewrite rules, so it cannot provide the SPA fallback without a
  workaround (e.g. copying `index.html` to `404.html`, which returns status 404). A host with rewrites is
  preferred.
- **`VITE_ROOT_API` is fixed at build time** - one build targets exactly one backend.
- **The session is stored in `localStorage`** (JWT) and restored on page load; an expired or malformed token
  is discarded, and any `401` response logs the user out. Role checks in the frontend are UX only - the
  backend must enforce them.
- The dashboard chunk is about 209 KB (71 KB gzipped), mostly Chart.js.
