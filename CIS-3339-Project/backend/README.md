# Data Platform Backend

Express 4 API on MongoDB (Mongoose 6), with JWT login, viewer/editor roles, and per-organization data
isolation. The full project setup (frontend, deployment, and known limitations) is in the
[repository README](../../README.md).

## Requirements

- Node.js 22.12+ or 24 LTS, and npm
- A MongoDB database. The committed `.env` points at the course Atlas cluster. A local `mongod` also works,
  e.g. `mongodb://127.0.0.1:27017/dataplatform`.

## Setup and run

```bash
cd CIS-3339-Project/backend
npm install
npm run db:init    # create the orgs, demo users, and sample data (safe to run again)
npm start          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm start` | Runs `node server.js`. Connects to `MONGO_URL`, then listens on `PORT`. Exits with code 1 if the database can't be reached. |
| `npm run dev` | The same, through nodemon, which restarts on file changes. |
| `npm run db:init` | Checks the config and creates whatever seed data is missing. Non-destructive. |
| `npm run db:reset` | **Destructive.** Deletes all data of the two seeded orgs, then seeds again (same as `npm run db:init -- --reset`). |
| `npm test` | Jest + Supertest against an in-memory MongoDB. Never touches `MONGO_URL`. |

There is nothing to create by hand in MongoDB: no collections, organizations, users, or password hashes.
`db:init` does all of it.

## Configuration (`.env`)

`backend/.env` is committed with the grading configuration. Variables already set in the environment take
precedence over the file.

| Variable | What it does |
| --- | --- |
| `MONGO_URL` | MongoDB connection string (required). |
| `PORT` | Port to listen on (`3000`). |
| `ORG_ID` | ObjectId of the organization this instance serves. Login only accepts users of this org, and `GET /org` returns its name. |
| `JWT_SECRET` | Secret for signing and verifying JWTs. Tokens expire after 30 days. |
| `CORS_ORIGIN` | Comma-separated list of allowed browser origins (committed: `http://localhost:5173,http://localhost:4173` for `npm run dev` and `npm run preview`; default if unset: `http://localhost:5173`). Add the deployed frontend's origin in production. |
| `SEED_VIEWER_USERNAME`, `SEED_VIEWER_PASSWORD` | Viewer account created by `db:init` (`user` / `user`). |
| `SEED_EDITOR_USERNAME`, `SEED_EDITOR_PASSWORD` | Editor account created by `db:init` (`admin` / `admin`). |

## Database initialization (`scripts/initDb.js`)

`npm run db:init`:

1. **Validates the configuration.** `MONGO_URL`, a valid `ORG_ID`, `JWT_SECRET`, and all four `SEED_*`
   values must be set. Otherwise it prints each problem under `Configuration error (check backend/.env):`
   and exits with code `1` without connecting.
2. **Creates the indexes** declared in `models/models.js` (for example, unique usernames per org).
3. **Creates whatever is missing**, looked up by a stable key (org + name, or username), so reruns never
   duplicate anything:
   - org `ORG_ID` ("Community Health Center") and org `64e0380b3cc28d087655694c` ("Outreach Partner Org",
     used for isolation tests; `db:init` refuses to run with `ORG_ID` set to this ID, but a server
     instance may use it)
   - users `user` (viewer), `admin` (editor), and `partner` (viewer in the second org, with the viewer
     password). Passwords are hashed with bcrypt. If a demo account already exists with a different
     password or role, it is reset to match `.env`.
   - 15 services, 16 clients, and 16 events in the main org (8 past events with 1-3 attendees each), and one
     service, client, and registered event in the second org
4. **Prints a summary** (`created: N   already present: M` for each collection) and the demo logins.

Output of a first run on an empty database:

```
--- Database initialization summary ---
orgs      created:  2   already present: 0
users     created:  3   already present: 0
services  created: 16   already present: 0
clients   created: 17   already present: 0
events    created: 17   already present: 0
```

A second run reports `created: 0` for every collection.

> **`npm run db:reset` is destructive.** It deletes **every** client, event, service, user, and org that
> belongs to the two seeded organizations, including records created through the app, and then seeds again.
> With the committed `.env`, this is the shared course database. Data of other organizations is not touched.

## Security model

- **`requireAuth`** (`auth/authMiddleWare.js`) requires `Authorization: Bearer <JWT>`. Otherwise it returns
  `401` with `Authentication required` or `Invalid or expired token`. It sets
  `req.user = { name, role, orgId }`. The module's default export is still `requireAuth`, for older imports.
- **`requireRole('editor')`** returns `403` (`You do not have permission to perform this action`) unless
  `req.user.role` is `editor`.
- **`withOrg(filter, req, field = 'org')`** (`auth/withOrg.js`) adds `{ [field]: req.user.orgId }` to a
  query filter. It is used on **every** client (`'orgs'`), event, and service query. The org always comes
  from the JWT, never from the body, query string, or URL. `cleanBody()` (`utils/http.js`) removes `_id`,
  `__v`, `$`-operators, and the org fields (and `attendees` on events) from request bodies.
- **Login** (`POST /users/login`) returns `{ "token": "<JWT>" }`, signed with `{ name, role, orgId }`. Any
  failure (unknown user, wrong password, or a user of another org) returns
  `401 {"error":"Invalid username or password"}`.
- **CORS** allows only the origins in `CORS_ORIGIN`.

### Status codes

| Status | When |
| --- | --- |
| `400` | Validation error, malformed JSON, or login without username/password |
| `401` | No token or an invalid token, or a failed login |
| `403` | A viewer calls a create/update/delete/register/deregister endpoint |
| `404` | Record not found, **in another organization**, or a malformed ID. Also unknown routes (`Not found`). |
| `409` | Delete blocked: client registered for events, event has attendees, or service used by events |
| `500` | Unexpected error (`Internal server error`; no details leak) |

Every error body has the same shape, produced by the error handler in `app.js`:

```json
{ "error": "Human readable message" }
```

Successful create, update, and delete calls return a plain string (e.g. `New client created successfully`,
`Service deleted successfully`), which the frontend shows as a toast.

## Endpoints

Legend: **public** = no login, **auth** = `requireAuth`, **editor** = `requireAuth` + `requireRole('editor')`.
Every auth/editor route is scoped with `withOrg`.

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /health` | public | `{"status":"ok","db":"connected"}` or `"disconnected"` |
| `POST /users/login` | public | body `{ "username", "password" }` → `{ "token" }` |
| `GET /org` | public | name of the `ORG_ID` organization |
| `GET /clients` | auth | all clients of the org |
| `GET /clients/id/:id` | auth | one client |
| `GET /clients/search?searchBy=name&firstName=&lastName=` / `?searchBy=number&phoneNumber=` | auth | |
| `GET /clients/byzip` | auth | client counts per zip code (dashboard) |
| `POST /clients` | editor | `201` string |
| `PUT /clients/update/:id` | editor | string |
| `DELETE /clients/:id` | editor | `409` if registered for any event |
| `GET /events` | auth | all events of the org |
| `GET /events/id/:id` | auth | one event |
| `GET /events/search?searchBy=name&name=` / `?searchBy=date&eventDate=` | auth | |
| `GET /events/client/:id` | auth | events the client is registered for |
| `GET /events/client/:id/not-registered` | auth | events the client is not registered for |
| `GET /events/attendees/:id` | auth | attendees of an event |
| `GET /events/service/:id` | auth | events that use a service |
| `GET /events/attendance` | auth | events of the past two months, oldest first (dashboard) |
| `POST /events` | editor | `201` string; service IDs must belong to the org |
| `PUT /events/update/:id` | editor | string |
| `PUT /events/register?event=<id>&client=<id>` | editor | `201 {"message":"Client registered for event",…}`; again → `200 {"message":"Already registered"}` |
| `PUT /events/deregister?event=<id>&client=<id>` | editor | `200 {"message":"Client deregistered from event",…}`; not registered → `200 {"message":"Not registered"}` |
| `DELETE /events/:id` | editor | `409` if it has attendees |
| `GET /services` | auth | all services of the org |
| `GET /services/id/:id` | auth | one service |
| `GET /services/search?searchBy=name&name=` / `?searchBy=description&description=` | auth | |
| `POST /services` | editor | `201` string |
| `PUT /services/update/:id` | editor | string |
| `DELETE /services/:id` | editor | `409` if used by an event |

Search text is matched case-insensitively and literally (regex characters are escaped). An unknown
`searchBy` returns `400`. For register and deregister, the event and the client must both be in the user's
org. Otherwise the response is `404` (`Event not found` / `Client not found`).

## Verifying the security rules with curl

With the server running on port 3000 and `npm run db:init` done (bash; in PowerShell, use `curl.exe` and
`$E = ...` variables):

```bash
# public health check
curl http://localhost:3000/health
# {"status":"ok","db":"connected"}

# log in (copy the token values)
curl -X POST http://localhost:3000/users/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
curl -X POST http://localhost:3000/users/login -H "Content-Type: application/json" -d '{"username":"user","password":"user"}'
E=<editor token>; V=<viewer token>

curl http://localhost:3000/clients                                   # 401 Authentication required
curl -X POST http://localhost:3000/services -H "Authorization: Bearer $V" \
     -H "Content-Type: application/json" -d '{"name":"X"}'            # 403 (viewer)
curl -X POST http://localhost:3000/services -H "Authorization: Bearer $E" \
     -H "Content-Type: application/json" -d '{"name":"X","status":"Active"}'   # 201 New service created successfully

# B1: run each twice to see "Already registered" / "Not registered"
curl -X PUT "http://localhost:3000/events/register?event=<eventId>&client=<clientId>"   -H "Authorization: Bearer $E"
curl -X PUT "http://localhost:3000/events/deregister?event=<eventId>&client=<clientId>" -H "Authorization: Bearer $E"
```

**Organization isolation:** start a second instance for the partner org on port 3001:

```bash
ORG_ID=64e0380b3cc28d087655694c PORT=3001 npm start                          # bash
# PowerShell: $env:ORG_ID = '64e0380b3cc28d087655694c'; $env:PORT = '3001'; npm start
```

Log in there as `partner` / `user` and `GET /clients` returns only "Other Client". Requesting that client's
ID on port 3000 with the `admin` token (GET, PUT, or DELETE) returns `404 {"error":"Client not found"}`, and
so does requesting a main-org client ID on port 3001 with the `partner` token.

All of the above was checked against a fresh database (Node 24.15, Windows 11). The automated version is in
`tests/` (`npm test`: 33 tests covering auth, roles, isolation, registration, and error handling).

## Project layout

```
app.js               Express app: CORS, JSON parsing, /health, routes, JSON 404, error handler
server.js            connects to MongoDB, then starts the app
auth/                requireAuth, requireRole, withOrg
routes/              clients, events, services, users (login), org
models/models.js     Mongoose schemas and indexes
scripts/initDb.js    npm run db:init / db:reset
utils/http.js        HttpError, asyncHandler, assertObjectId, cleanBody, escapeRegex
tests/               Jest + Supertest tests (in-memory MongoDB)
```
