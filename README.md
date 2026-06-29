# Swiftdrop API

Backend API for **Swiftdrop**, a last-mile delivery platform. Handles parcel registration, delivery agent management, route assignments, delivery event tracking, and agent performance reporting.

## Tech Stack

- **NestJS** with **Fastify** adapter
- **PostgreSQL** with **Drizzle ORM** and **drizzle-kit** migrations
- **JWT** authentication and **API key** guard
- **class-validator** / **class-transformer** for request validation
- **Jest** for unit and e2e tests
- **GitHub Actions** for CI

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and update values as needed:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWT access tokens |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `1d`, `12h`) |
| `API_KEY` | Required `x-api-key` header value for protected routes |

### 3. Run database migrations

Ensure PostgreSQL is running and the database exists, then apply migrations:

```bash
npm run db:migrate
```

Generate new migrations after schema changes:

```bash
npm run db:generate
```

Verify migrations match the current schema:

```bash
npm run db:check
```

### 4. Seed sample users (optional)

Creates an admin and delivery agent (password: `password123`):

```bash
npm run db:seed
```

- Admin: `admin@swiftdrop.com`
- Agent: `agent@swiftdrop.com`

### 5. Start the server

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

The API listens on `http://localhost:3000` by default.

## Authentication

Most routes require two headers:

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
| `GET` | `/users` | Admin |
| `GET` | `/users/:id` | Admin or self |
| `PATCH` | `/users/:id/availability` | Admin or self (agents only) |

### Parcels

| Method | Route | Access |
|---|---|---|
| `POST` | `/parcels` | Admin |
| `GET` | `/parcels` | Admin (all) / Agent (assigned) |
| `GET` | `/parcels/:id` | Admin or assigned agent |
| `GET` | `/parcels/:id/history` | Admin or assigned agent |
| `PATCH` | `/parcels/:id/assign` | Admin |
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

## Parcel Status Flow

```
REGISTERED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
                              ↓
                        FAILED_ATTEMPT → OUT_FOR_DELIVERY → DELIVERED
```

Invalid jumps (e.g. `REGISTERED → DELIVERED`) are rejected with a structured error.

## Testing

```bash
# unit tests
npm test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

## Linting & Formatting

```bash
# check lint (CI)
npm run lint:check

# auto-fix
npm run lint

# format
npm run format
```

## Project Structure

```
src/
├── common/           # guards, filters, decorators, enums, state machine
├── config/           # environment configuration
├── database/         # Drizzle schema, service, seed
└── modules/
    ├── auth/
    ├── users/
    ├── parcels/
    ├── delivery-events/
    └── reports/
```

## CI

GitHub Actions runs on every push and pull request to `main`:

- **lint-test-build** — lint, unit tests, e2e tests, build
- **migration-check** — `drizzle-kit check` to verify migrations match schema

## License

UNLICENSED — private assignment project.
