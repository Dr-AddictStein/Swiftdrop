# Swiftdrop

**Swiftdrop** is a **multi-tenant SaaS** last-mile delivery platform for registering parcels, managing delivery agents, tracking delivery events, and reporting on agent performance. Each delivery company is an isolated tenant with its own admin, agents, parcels, and notifications. A **super admin** operates across every tenant. The repo includes a **NestJS + Fastify API** (with interactive Swagger docs), and a **React dashboard** with **super-admin, admin, and agent** portals and live updates.

> **API docs:** run the API and open **[http://localhost:3000/docs](http://localhost:3000/docs)** (Swagger UI). See [API Documentation](#api-documentation) for the Markdown reference, OpenAPI spec, and Postman collection.

## Multi-tenancy model

- A **company** is a tenant. Every user (admin or delivery agent) and every parcel belongs to exactly one company (`company_id`).
- Admins **self-register** via `POST /auth/register`, which atomically creates the company and its owner admin, and returns a unique **join code**.
- Admins create delivery agents under their own company; agents inherit the admin's `company_id`.
- All data access (parcels, users, reports, notifications, realtime events) is **scoped to the caller's company** — an admin can never see another company's data.
- The JWT access token carries `companyId`, so tenant scoping is enforced from the token on every request.
- A **super admin** (`SUPER_ADMIN`) has no company and works **across all tenants** via the `/platform/*` endpoints: monitor everything and provision new companies and delivery agents.

### Roles

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Cross-tenant. Monitors the whole platform and creates companies/agents via `/platform/*`. |
| `ADMIN` | Owns one company: manages its agents, parcels, assignment, notifications and reports. |
| `DELIVERY_AGENT` | Belongs to one company: handles assigned parcels, switches company, reports incidents. |

### Agent lifecycle & auto-reassignment

Two edge cases are handled automatically (see [Agents](#agents)):

1. **Agent can no longer deliver** (accident / goes offline). The agent (or their admin) reports an incident. The agent is marked unavailable and **every still-active parcel** they hold is auto-assigned to the **available teammate with the smallest active queue** in the same company. The admin is notified. If no teammate is available, the parcel is left unassigned and flagged for **manual assignment**.
2. **Agent switches company.** Before the move, the agent's active parcels in the old company are auto-reassigned exactly as above (old admin notified), then the agent is moved to the target company (via its join code) and the new admin is notified.

"Active" means any parcel not yet `DELIVERED`. Reassigned parcels are reset to `REGISTERED` (so the new agent picks up fresh), the retry flag is cleared, and a delivery event is logged for the audit timeline.

## Tech Stack

### Backend
- **NestJS** with **Fastify** adapter
- **PostgreSQL** with **Drizzle ORM** and **drizzle-kit** migrations
- **JWT** authentication and **API key** guard
- **Server-Sent Events (SSE)** for real-time parcel updates
- **class-validator** / **class-transformer** for request validation
- **Swagger UI / OpenAPI** interactive docs served at `/docs`
- **Jest** for unit and e2e tests
- **GitHub Actions** for CI

### Frontend (`Frontend/`)
- **React 19** + **TypeScript** + **Vite**
- **react-router-dom** for role-based routing (super-admin, admin, agent portals)
- SSE client for live dashboard updates (no manual refresh needed)

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+

## Quick Start

### 1. Backend

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run migrations and seed demo users
npm run db:migrate
npm run db:seed

# Start API (http://localhost:3000)
npm run start:dev
```

Interactive API docs are then available at **http://localhost:3000/docs**.

### 2. Frontend dashboard

```bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

See [Frontend/README.md](./Frontend/README.md) for dashboard-specific details.

## Environment Variables

### Backend (`.env`)

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWT access tokens |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `1d`, `12h`) |
| `API_KEY` | Required `x-api-key` header value for protected routes |

### Frontend (`Frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL |
| `VITE_API_KEY` | `dev-api-key` | Must match backend `API_KEY` |

## Demo Accounts

The seed creates a **platform super admin** plus **two companies** so multi-tenancy can be demonstrated. Password for every account is `password123`.

| Company | Join code | Role | Email |
|---|---|---|---|
| _(platform-wide)_ | — | Super Admin | `superadmin@swiftdrop.com` |
| Swiftdrop Logistics | `SWIFT1` | Admin | `admin@swiftdrop.com` |
| Swiftdrop Logistics | `SWIFT1` | Agent | `agent@swiftdrop.com` |
| Swiftdrop Logistics | `SWIFT1` | Agent | `agent2@swiftdrop.com` |
| Metro Couriers | `METRO1` | Admin | `admin@metro.com` |
| Metro Couriers | `METRO1` | Agent | `agent@metro.com` |

New companies self-register via `POST /auth/register`, or a super admin can create them from the **Platform Console**. Admins can also create new delivery agents (with custom passwords) under their own company from the **Users** page in the dashboard.

## Dashboard Overview

### Super admin console
| Page | Features |
|---|---|
| **Overview** | Platform-wide totals (companies, admins, agents, parcels), parcels-by-status, and a per-company breakdown |
| **Companies** | List every company with owner and volume counts; **create a company + its owner admin** |
| **Users** | List all users across companies; **create a delivery agent** for any company |
| **Parcels** | Live, cross-company view of every parcel, filterable by company |

### Admin portal
| Page | Features |
|---|---|
| **Overview** | Parcel stats, recent parcels with assigned agents, agent performance snapshot, retry queue size |
| **Parcels** | Register parcels, filter by status/sender, assign agents, view agent handling each parcel |
| **Users** | View team, **create new delivery agents** (name, email, password), toggle agent availability |
| **Retry Queue** | View failed deliveries with assigned agent, re-queue parcels |
| **Reports** | Full agent performance metrics (deliveries, success rate, avg pickup-to-delivery time) |

### Agent portal
| Page | Features |
|---|---|
| **Dashboard** | Active delivery stats and quick list |
| **My Deliveries** | Full list of assigned parcels with filters |
| **Parcel detail** | Update status (pickup → out for delivery → delivered/failed), add notes, view timeline |
| **Retry Queue** | Dispatch queued retries |
| **Profile** | Toggle availability for new assignments |

### Real-time updates
The dashboard connects to `GET /realtime/stream` via SSE. When parcels are assigned or statuses change:
- **Agents** see new assignments appear automatically on their dashboard
- **Admins** see status and assignment changes update live across overview, parcels, and detail views

A **Live** indicator appears in the dashboard when the stream is connected.

### Typical workflow
1. **Admin** registers a parcel and assigns it to an available agent
2. **Agent** sees the assignment instantly → picks up → out for delivery → delivered (or failed attempt)
3. Failed parcels enter the **retry queue**; admin can re-queue; agent dispatches retry
4. **Admin** tracks which agent handled each step via parcel detail timeline and assigned-agent columns

## Authentication

Most API routes require two headers:

```http
x-api-key: <API_KEY>
Authorization: Bearer <JWT access token>
```

Obtain a JWT via login (public route — no API key or JWT required):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@swiftdrop.com","password":"password123"}'
```

## API Documentation

The API is documented three ways, all kept in sync from a single OpenAPI spec:

| Artifact | Location | Purpose |
|---|---|---|
| **Live Swagger UI** | `GET /docs` (served by the API) | Browse and "Try it out" on every endpoint |
| **OpenAPI JSON / YAML** | `GET /docs-json`, `GET /docs-yaml` | Machine-readable spec (import into tools) |
| **OpenAPI spec** | [`docs/openapi.yaml`](./docs/openapi.yaml) | Source of truth; also what `/docs` serves at runtime |
| **Markdown reference** | [`docs/API.md`](./docs/API.md) | Human-readable endpoint reference with examples |
| **Postman collection** | [`postman/`](./postman) | Ready-to-import requests grouped by role & operation, plus an environment |

The `/docs*` routes are **public** (no API key or token needed to view them). In Swagger UI, use the **Authorize** button to set your `x-api-key` and Bearer token, then call endpoints directly.

### Viewing / validating the spec offline

```bash
npm run docs:preview   # interactive Redoc site at http://localhost:8080
npm run docs:lint      # validate docs/openapi.yaml
```

Or open <https://editor.swagger.io> and import `docs/openapi.yaml`.

### Using the Postman collection

1. In Postman: *Import* → select `postman/Swiftdrop.postman_collection.json` and `postman/Swiftdrop.postman_environment.json`.
2. Select the **Swiftdrop - Local** environment (top-right).
3. In **Authentication (Public)**, send **Login - Super Admin**, **Login - Admin**, and **Login - Delivery Agent** — their test scripts store the JWTs automatically.
4. Run any other request. List endpoints (users, parcels, notifications, companies) capture ids/join codes into variables, so id-based requests work without manual edits.

## API Overview

Every route except the public ones (`GET /`, `POST /auth/register`, `POST /auth/login`, and the `/docs*` routes) requires both the `x-api-key` and `Authorization: Bearer <JWT>` headers.

### Auth

| Method | Route | Access |
|---|---|---|
| `GET` | `/` | Public — health check |
| `POST` | `/auth/register` | Public — create a new company + owner admin |
| `POST` | `/auth/login` | Public |

**Register body:**
```json
{
  "companyName": "Acme Delivery",
  "name": "Alice Admin",
  "email": "alice@acme.com",
  "password": "securepassword"
}
```

Login/register responses include `user.companyId` and an `accessToken` whose payload carries `companyId`.

### Platform (Super Admin)

Cross-tenant endpoints; all require the `SUPER_ADMIN` role.

| Method | Route | Access |
|---|---|---|
| `GET` | `/platform/overview` | Super admin — platform-wide totals + per-company stats |
| `GET` | `/platform/companies` | Super admin — every company with owner and volume counts |
| `POST` | `/platform/companies` | Super admin — create a company + its owner admin |
| `GET` | `/platform/users` | Super admin — every user across all companies |
| `POST` | `/platform/agents` | Super admin — create a delivery agent for any company |
| `GET` | `/platform/parcels` | Super admin — every parcel across all companies |

**Create company body:** `{ "companyName": "...", "adminName": "...", "adminEmail": "...", "adminPassword": "..." }`
**Create agent body:** `{ "companyId": "...", "name": "...", "email": "...", "password": "...", "isAvailable": true }`

### Companies

| Method | Route | Access |
|---|---|---|
| `GET` | `/companies` | Authenticated — list companies (`id`, `name`, `joinCode`); lets an agent discover a company to switch to |
| `GET` | `/companies/me` | Admin — details of the caller's own company |

### Users

| Method | Route | Access |
|---|---|---|
| `POST` | `/users` | Admin — create a delivery agent **in the admin's company** (name, email, password) |
| `GET` | `/users` | Admin — team members of the caller's company |
| `GET` | `/users/:id` | Admin (same company) or self |
| `PATCH` | `/users/:id/availability` | Admin (same company) or self (agents only) |

### Agents (lifecycle)

| Method | Route | Access |
|---|---|---|
| `POST` | `/agents/me/switch-company` | Agent — switch to another company by `joinCode` (auto-reassigns active parcels, notifies both admins) |
| `POST` | `/agents/me/report-incident` | Agent — self-report inability to deliver (auto-reassigns active parcels, notifies admin) |
| `POST` | `/agents/:agentId/report-incident` | Admin — report an incident for an agent in the caller's company |

**Switch company body:** `{ "joinCode": "METRO1" }`
**Report incident body:** `{ "reason": "Vehicle breakdown" }` (optional)

### Notifications

| Method | Route | Access |
|---|---|---|
| `GET` | `/notifications` | Admin — the caller's notification inbox (newest first) |
| `PATCH` | `/notifications/:id/read` | Admin — mark a notification read |

Notifications are also pushed live over SSE (`notification.created`) to the recipient admin.

**Create delivery agent body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@swiftdrop.com",
  "password": "securepassword",
  "isAvailable": true
}
```

### Parcels

| Method | Route | Access |
|---|---|---|
| `POST` | `/parcels` | Admin |
| `GET` | `/parcels` | Admin (all) / Agent (assigned only) |
| `GET` | `/parcels/retry-queue` | Admin (all) / Agent (assigned only) |
| `GET` | `/parcels/:id` | Admin or assigned agent |
| `GET` | `/parcels/:id/history` | Admin or assigned agent |
| `PATCH` | `/parcels/:id/assign` | Admin |
| `PATCH` | `/parcels/:id/requeue` | Admin — manually flag a failed parcel for retry |
| `PATCH` | `/parcels/:id/retry-dispatch` | Assigned agent — dispatch a queued retry |
| `PATCH` | `/parcels/:id/status` | Assigned delivery agent |

Query params for `GET /parcels`: `status`, `sender`

### Delivery Events

| Method | Route | Access |
|---|---|---|
| `POST` | `/delivery-events` | Delivery agent |
| `GET` | `/delivery-events/:parcelId` | Admin or assigned agent |

### Reports

| Method | Route | Access |
|---|---|---|
| `GET` | `/reports/agents` | Admin |

Returns per-agent **total deliveries**, **success rate**, and **average pickup-to-delivery time**, scoped to the admin's company.

### Realtime

| Method | Route | Access |
|---|---|---|
| `GET` | `/realtime/stream` | Authenticated (SSE) |

Pushes `parcel.updated` events when parcels are created, assigned, re-queued, reassigned, or change status. Admins receive events for parcels **in their own company**; agents receive events only for parcels assigned to them. Also pushes `notification.created` events to the recipient admin (e.g. when an agent leaves, an incident is reported, or a parcel needs manual assignment).

#### Retry queue
When a parcel transitions to `FAILED_ATTEMPT`, it is automatically flagged with `retryQueued: true`. Admins list the queue via `GET /parcels/retry-queue` and can manually re-queue failed parcels. Assigned agents dispatch retries via `PATCH /parcels/:id/retry-dispatch`, moving the parcel back to `OUT_FOR_DELIVERY` and clearing the queue flag.

## Parcel Status Flow

```
REGISTERED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
                              ↓
                        FAILED_ATTEMPT → OUT_FOR_DELIVERY → DELIVERED
```

Invalid jumps (e.g. `REGISTERED → DELIVERED`) are rejected with a structured error.

## Database

```bash
npm run db:migrate    # apply migrations
npm run db:generate   # generate migration after schema changes
npm run db:check      # verify migrations match schema
npm run db:seed       # seed demo admin + agent
npm run db:studio     # Drizzle Studio (optional)
```

Migrations live in `drizzle/migrations/`.

## Testing

```bash
# unit tests
npm test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

### Frontend

```bash
cd Frontend
npm run build    # type-check + production build
```

## Linting & Formatting

```bash
npm run lint:check   # check lint (CI)
npm run lint         # auto-fix
npm run format       # prettier
```

## Project Structure

```
├── Frontend/                 # React dashboard (super-admin, admin, agent portals)
│   └── src/
│       ├── api/              # REST + SSE clients
│       ├── components/       # Layout, modals, status badges, agent info
│       ├── context/          # Auth, realtime + notifications providers
│       ├── hooks/            # useDeliveryAgents, etc.
│       └── pages/            # platform/ (super admin), admin/, agent/, shared parcel pages
├── src/                      # NestJS backend
│   ├── main.ts               # bootstrap + Swagger UI (/docs) wiring
│   ├── common/               # guards, filters, decorators, state machine
│   ├── config/
│   ├── database/             # Drizzle schema, service, seed
│   └── modules/
│       ├── auth/             # login + company/admin registration
│       ├── platform/         # super-admin cross-tenant overview/companies/users/agents/parcels
│       ├── companies/        # tenant companies + join codes
│       ├── users/
│       ├── agents/           # agent lifecycle: switch company, incident reassignment
│       ├── parcels/          # includes least-queue auto-reassignment
│       ├── delivery-events/
│       ├── notifications/    # admin notification inbox + SSE
│       ├── reports/
│       └── realtime/         # SSE event stream
├── docs/                     # openapi.yaml (spec) + API.md (Markdown reference)
├── postman/                  # Postman collection + environment
├── drizzle/migrations/
└── test/                     # e2e tests
```

## CORS

The API enables CORS for the dashboard (`origin: true`, credentials). All HTTP methods used by the frontend (`GET`, `POST`, `PATCH`, etc.) and headers (`Authorization`, `x-api-key`, `Content-Type`) are allowed.

## CI

GitHub Actions runs on every push and pull request to `main`:

- **lint-test-build** — lint, unit tests, e2e tests, build
- **migration-check** — `drizzle-kit check` to verify migrations match schema

## License

UNLICENSED — private assignment project.
