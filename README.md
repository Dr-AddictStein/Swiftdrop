# Swiftdrop

**Swiftdrop** is a last-mile delivery platform for registering parcels, managing delivery agents, tracking delivery events, and reporting on agent performance. The repo includes a **NestJS + Fastify API** and a **React admin/agent dashboard** with live updates.

## Tech Stack

### Backend
- **NestJS** with **Fastify** adapter
- **PostgreSQL** with **Drizzle ORM** and **drizzle-kit** migrations
- **JWT** authentication and **API key** guard
- **Server-Sent Events (SSE)** for real-time parcel updates
- **class-validator** / **class-transformer** for request validation
- **Jest** for unit and e2e tests
- **GitHub Actions** for CI

### Frontend (`Frontend/`)
- **React 19** + **TypeScript** + **Vite**
- **react-router-dom** for role-based routing
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

| Role | Email | Password |
|---|---|---|
| Admin | `admin@swiftdrop.com` | `password123` |
| Agent | `agent@swiftdrop.com` | `password123` |

Admins can also create new delivery agents (with custom passwords) from the **Users** page in the dashboard.

## Dashboard Overview

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

## API Overview

### Auth

| Method | Route | Access |
|---|---|---|
| `POST` | `/auth/login` | Public |

### Users

| Method | Route | Access |
|---|---|---|
| `POST` | `/users` | Admin — create a delivery agent (name, email, password) |
| `GET` | `/users` | Admin |
| `GET` | `/users/:id` | Admin or self |
| `PATCH` | `/users/:id/availability` | Admin or self (agents only) |

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

Returns per-agent **total deliveries**, **success rate**, and **average pickup-to-delivery time**.

### Realtime

| Method | Route | Access |
|---|---|---|
| `GET` | `/realtime/stream` | Authenticated (SSE) |

Pushes `parcel.updated` events when parcels are created, assigned, re-queued, or change status. Admins receive all events; agents receive events only for parcels assigned to them.

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
├── Frontend/                 # React dashboard (admin + agent portals)
│   └── src/
│       ├── api/              # REST + SSE clients
│       ├── components/       # Layout, modals, status badges, agent info
│       ├── context/          # Auth + realtime providers
│       ├── hooks/            # useDeliveryAgents, etc.
│       └── pages/            # admin/, agent/, shared parcel pages
├── src/                      # NestJS backend
│   ├── common/               # guards, filters, decorators, state machine
│   ├── config/
│   ├── database/             # Drizzle schema, service, seed
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── parcels/
│       ├── delivery-events/
│       ├── reports/
│       └── realtime/         # SSE event stream
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
