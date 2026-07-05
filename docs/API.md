# Swiftdrop Delivery API Reference

Multi-tenant last-mile delivery management API. Each **company** is an isolated
tenant; an **ADMIN** owns a company, a **DELIVERY_AGENT** belongs to one company,
and a **SUPER_ADMIN** operates across every company.

- **Base URL (local):** `http://localhost:3000`
- **Interactive docs:** `GET /docs` (Swagger UI) — machine-readable spec at
  `GET /docs-json` and `GET /docs-yaml`.
- **Source of truth:** [`openapi.yaml`](./openapi.yaml)

---

## Authentication

Every endpoint **except** the public ones (`GET /`, `POST /auth/register`,
`POST /auth/login`, and the `/docs*` routes) requires **two** headers:

| Header | Value | Notes |
|--------|-------|-------|
| `x-api-key` | `dev-api-key` (from the `API_KEY` env var) | Shared gateway key. |
| `Authorization` | `Bearer <JWT>` | Token from `/auth/login` or `/auth/register`. |

A missing/invalid API key or JWT returns `401`. A valid user without the
required role (or acting outside their company) returns `403`.

### Roles

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | Cross-tenant. Monitors everything and provisions companies/agents via `/platform/*`. |
| `ADMIN` | Owns one company: manages its agents, parcels, notifications and reports. |
| `DELIVERY_AGENT` | Belongs to one company: handles assigned parcels, switches company, reports incidents. |

---

## Common objects

### Error

All errors share this shape (produced by the global exception filter):

```json
{
  "statusCode": 400,
  "message": "email must be an email",
  "error": "Bad Request",
  "timestamp": "2026-07-05T00:00:00.000Z",
  "path": "/auth/login"
}
```

`message` is a string, or an array of strings for validation errors.

### Enums

- **UserRole:** `SUPER_ADMIN`, `ADMIN`, `DELIVERY_AGENT`
- **ParcelStatus:** `REGISTERED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED_ATTEMPT`
- **NotificationType:** `AGENT_LEFT_COMPANY`, `AGENT_JOINED_COMPANY`, `AGENT_INCIDENT_REPORTED`, `PARCEL_REASSIGNED`, `PARCEL_NEEDS_MANUAL_ASSIGNMENT`

### Parcel status flow

```
REGISTERED ─▶ PICKED_UP ─▶ OUT_FOR_DELIVERY ─▶ DELIVERED
                                  │
                                  ▼
                            FAILED_ATTEMPT ─▶ OUT_FOR_DELIVERY (retry)
```

---

## Endpoint index

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Health check |
| POST | `/auth/register` | Public | Register company + owner admin |
| POST | `/auth/login` | Public | Log in |
| GET | `/platform/overview` | SUPER_ADMIN | Cross-tenant statistics |
| GET | `/platform/companies` | SUPER_ADMIN | List all companies |
| POST | `/platform/companies` | SUPER_ADMIN | Create company + owner admin |
| GET | `/platform/users` | SUPER_ADMIN | List all users |
| POST | `/platform/agents` | SUPER_ADMIN | Create agent for any company |
| GET | `/platform/parcels` | SUPER_ADMIN | List all parcels |
| GET | `/companies` | Any | List companies (id, name, join code) |
| GET | `/companies/me` | ADMIN | Get my company |
| POST | `/users` | ADMIN | Create delivery agent |
| GET | `/users` | ADMIN | List users in my company |
| GET | `/users/:id` | Any | Get a user |
| PATCH | `/users/:id/availability` | Any | Update availability |
| POST | `/parcels` | ADMIN | Register a parcel |
| GET | `/parcels` | Any | List parcels (filterable) |
| GET | `/parcels/retry-queue` | Any | List retry-queued parcels |
| GET | `/parcels/:id` | Any | Get a parcel |
| GET | `/parcels/:id/history` | Any | Parcel delivery timeline |
| PATCH | `/parcels/:id/assign` | ADMIN | Assign parcel to agent |
| PATCH | `/parcels/:id/requeue` | ADMIN | Flag parcel for retry |
| PATCH | `/parcels/:id/status` | DELIVERY_AGENT | Update parcel status |
| PATCH | `/parcels/:id/retry-dispatch` | DELIVERY_AGENT | Dispatch a retry |
| POST | `/delivery-events` | DELIVERY_AGENT | Record a delivery event |
| GET | `/delivery-events/:parcelId` | Any | Parcel delivery timeline |
| POST | `/agents/me/switch-company` | DELIVERY_AGENT | Switch company (corner case 2) |
| POST | `/agents/me/report-incident` | DELIVERY_AGENT | Self-report incident (corner case 1) |
| POST | `/agents/:agentId/report-incident` | ADMIN | Report incident for an agent |
| GET | `/notifications` | ADMIN | List my notifications |
| PATCH | `/notifications/:id/read` | ADMIN | Mark notification read |
| GET | `/reports/agents` | ADMIN | Agent performance report |
| GET | `/realtime/stream` | Any | Live SSE event stream |

> "Any" = any authenticated user; the service still scopes data to the caller's
> company (admins see their company; agents see only their own records).

---

## Auth

### `POST /auth/register` — Public

Creates a new company (tenant) with a generated join code plus its first ADMIN,
and returns a session.

Request:

```json
{
  "companyName": "Acme Delivery",
  "name": "Alice Admin",
  "email": "alice@acme.com",
  "password": "password123"
}
```

Response `201`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "name": "Alice Admin",
    "email": "alice@acme.com",
    "role": "ADMIN",
    "companyId": "uuid"
  }
}
```

Errors: `400` validation, `409` email already exists.

### `POST /auth/login` — Public

Request:

```json
{ "email": "admin@swiftdrop.com", "password": "password123" }
```

Response `201`: same `AuthResponse` shape as register. Errors: `400`, `401`.

---

## Platform (Super Admin)

All routes require `SUPER_ADMIN`. Errors: `401`, `403` (plus those noted).

### `GET /platform/overview`

Response `200`:

```json
{
  "totals": {
    "companies": 3,
    "admins": 3,
    "agents": 5,
    "parcels": 42,
    "parcelsByStatus": { "REGISTERED": 4, "OUT_FOR_DELIVERY": 2, "DELIVERED": 36 }
  },
  "companies": [
    {
      "id": "uuid",
      "name": "Swiftdrop Logistics",
      "joinCode": "SWIFT1",
      "ownerName": "Admin One",
      "ownerEmail": "admin@swiftdrop.com",
      "agentCount": 2,
      "parcelCount": 20,
      "deliveredCount": 18,
      "createdAt": "2026-07-04T10:00:00.000Z"
    }
  ]
}
```

### `GET /platform/companies`

Response `200`: array of the `companies[]` object shown above.

### `POST /platform/companies`

Request:

```json
{
  "companyName": "Metro Couriers",
  "adminName": "Bob Admin",
  "adminEmail": "bob@metro.com",
  "adminPassword": "password123"
}
```

Response `201`:

```json
{
  "company": {
    "id": "uuid",
    "name": "Metro Couriers",
    "joinCode": "MVZJUWF7",
    "ownerId": "uuid",
    "createdAt": "…",
    "updatedAt": "…"
  },
  "admin": {
    "id": "uuid",
    "name": "Bob Admin",
    "email": "bob@metro.com",
    "role": "ADMIN",
    "companyId": "uuid"
  }
}
```

Errors: `400`, `409` duplicate email.

### `GET /platform/users`

Response `200`: array of users enriched with company:

```json
[
  {
    "id": "uuid",
    "name": "Casey Courier",
    "email": "casey@metro.com",
    "role": "DELIVERY_AGENT",
    "companyId": "uuid",
    "companyName": "Metro Couriers",
    "isAvailable": true,
    "createdAt": "…"
  }
]
```

### `POST /platform/agents`

Request:

```json
{
  "companyId": "uuid",
  "name": "Casey Courier",
  "email": "casey@metro.com",
  "password": "password123",
  "isAvailable": true
}
```

Response `201`: a `User` object. Errors: `400`, `404` company not found, `409`
duplicate email.

### `GET /platform/parcels`

Response `200`: array of parcels enriched with company + agent names:

```json
[
  {
    "id": "uuid",
    "trackingNumber": "SWFT-2K5J8N",
    "status": "OUT_FOR_DELIVERY",
    "retryQueued": false,
    "companyId": "uuid",
    "companyName": "Metro Couriers",
    "assignedAgentId": "uuid",
    "assignedAgentName": "Casey Courier",
    "senderName": "Warehouse A",
    "recipientName": "John Doe",
    "createdAt": "…"
  }
]
```

---

## Companies

### `GET /companies` — Any authenticated

Response `200`:

```json
[{ "id": "uuid", "name": "Swiftdrop Logistics", "joinCode": "SWIFT1" }]
```

### `GET /companies/me` — ADMIN

Response `200`:

```json
{
  "id": "uuid",
  "name": "Swiftdrop Logistics",
  "joinCode": "SWIFT1",
  "ownerId": "uuid",
  "createdAt": "…",
  "updatedAt": "…"
}
```

Errors: `403`, `404` (caller has no company).

---

## Users

The `User` object:

```json
{
  "id": "uuid",
  "name": "Jane Smith",
  "email": "jane@swiftdrop.com",
  "role": "DELIVERY_AGENT",
  "companyId": "uuid",
  "isAvailable": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### `POST /users` — ADMIN

Creates a delivery agent in the admin's company.

Request:

```json
{
  "name": "Jane Smith",
  "email": "jane@swiftdrop.com",
  "password": "password123",
  "isAvailable": true
}
```

Response `201`: `User`. Errors: `400`, `403`, `409`.

### `GET /users` — ADMIN

Response `200`: array of `User` for the admin's company.

### `GET /users/:id` — Any authenticated

Admins can view any user in their company; agents can view only their own
profile. Response `200`: `User`. Errors: `403`, `404`.

### `PATCH /users/:id/availability` — Any authenticated

Admins toggle any agent in their company; agents toggle their own.

Request:

```json
{ "isAvailable": false }
```

Response `200`: `User`. Errors: `400`, `403`, `404`.

---

## Parcels

The `Parcel` object:

```json
{
  "id": "uuid",
  "trackingNumber": "SWFT-2K5J8N",
  "companyId": "uuid",
  "senderName": "Warehouse A",
  "senderAddress": "12 Depot Road",
  "recipientName": "John Doe",
  "recipientAddress": "88 Maple Street",
  "assignedAgentId": null,
  "status": "REGISTERED",
  "retryQueued": false,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### `POST /parcels` — ADMIN

`trackingNumber` is generated when omitted.

Request:

```json
{
  "senderName": "Warehouse A",
  "senderAddress": "12 Depot Road",
  "recipientName": "John Doe",
  "recipientAddress": "88 Maple Street"
}
```

Response `201`: `Parcel`. Errors: `400`, `403`.

### `GET /parcels` — Any authenticated

Admins see all parcels in their company; agents see only parcels assigned to
them.

Query parameters:

| Param | Type | Notes |
|-------|------|-------|
| `status` | ParcelStatus | Optional exact status filter. |
| `sender` | string | Optional case-insensitive partial match on sender name. |

Response `200`: array of `Parcel`.

### `GET /parcels/retry-queue` — Any authenticated

Response `200`: array of `Parcel` flagged for retry, scoped to the caller.

### `GET /parcels/:id` — Any authenticated

Response `200`: `Parcel`. Errors: `403`, `404`.

### `GET /parcels/:id/history` — Any authenticated

Response `200`: array of `DeliveryEvent` (chronological):

```json
[
  {
    "id": "uuid",
    "parcelId": "uuid",
    "status": "PICKED_UP",
    "remarks": "Picked up from depot",
    "createdBy": "uuid",
    "createdAt": "…"
  }
]
```

### `PATCH /parcels/:id/assign` — ADMIN

Request:

```json
{ "assignedAgentId": "uuid" }
```

Response `200`: `Parcel`. Errors: `400`, `403`, `404`.

### `PATCH /parcels/:id/requeue` — ADMIN

No body. Response `200`: `Parcel`. Errors: `403`, `404`.

### `PATCH /parcels/:id/status` — DELIVERY_AGENT

Records a status change for a parcel assigned to the calling agent; the
transition must be valid for the current status.

Request:

```json
{ "status": "PICKED_UP", "remarks": "Picked up from depot" }
```

Response `200`:

```json
{ "parcel": { "…Parcel…" }, "event": { "…DeliveryEvent…" } }
```

Errors: `400` invalid transition / unassigned pickup, `403`, `404`.

### `PATCH /parcels/:id/retry-dispatch` — DELIVERY_AGENT

Moves a retry-queued, `FAILED_ATTEMPT` parcel back to `OUT_FOR_DELIVERY`.

Request (optional):

```json
{ "remarks": "Second attempt scheduled" }
```

Response `200`: `{ parcel, event }`. Errors: `400`, `403`, `404`.

---

## Delivery Events

### `POST /delivery-events` — DELIVERY_AGENT

Alternative to `PATCH /parcels/:id/status`.

Request:

```json
{ "parcelId": "uuid", "status": "OUT_FOR_DELIVERY", "remarks": "On the way" }
```

Response `201`: `{ parcel, event }`. Errors: `400`, `403`, `404`.

### `GET /delivery-events/:parcelId` — Any authenticated

Response `200`: array of `DeliveryEvent`. Errors: `403`, `404`.

---

## Agents (lifecycle)

### `POST /agents/me/switch-company` — DELIVERY_AGENT

**Corner case 2.** The calling agent moves to the company identified by
`joinCode`. Their active parcels in the previous company are auto-reassigned to
the teammate with the smallest queue, both admins are notified, and the agent is
attached to the new company. The current JWT still carries the old company, so
the agent should log in again after switching.

Request:

```json
{ "joinCode": "METRO1" }
```

Response `201`:

```json
{
  "agent": { "…User…" },
  "previousCompanyReassignment": {
    "reassignments": [
      { "parcelId": "uuid", "trackingNumber": "…", "fromAgentId": "uuid", "toAgentId": "uuid" }
    ],
    "unassigned": [{ "parcelId": "uuid", "trackingNumber": "…" }]
  }
}
```

Errors: `400` (already in that company), `403`, `404` (bad join code).

### `POST /agents/me/report-incident` — DELIVERY_AGENT

**Corner case 1 (self).** Marks the calling agent unavailable and auto-reassigns
their active parcels to the least-loaded available teammate; the company owner is
notified.

Request (optional):

```json
{ "reason": "Vehicle breakdown" }
```

Response `201`:

```json
{
  "agentId": "uuid",
  "companyId": "uuid",
  "reason": "Vehicle breakdown",
  "reassignments": [ { "parcelId": "uuid", "trackingNumber": "…", "fromAgentId": "uuid", "toAgentId": "uuid" } ],
  "unassigned": []
}
```

Errors: `400` (agent has no company), `403`, `404`.

### `POST /agents/:agentId/report-incident` — ADMIN

**Corner case 1 (admin-triggered).** Same behaviour as the self-report endpoint,
for an agent in the admin's company. Same request/response as above.
Errors: `400`, `403` (agent in another company), `404`.

---

## Notifications

The `Notification` object:

```json
{
  "id": "uuid",
  "companyId": "uuid",
  "recipientId": "uuid",
  "type": "AGENT_INCIDENT_REPORTED",
  "message": "Jane can no longer deliver (Vehicle breakdown). 2 parcel(s) auto-assigned to other agents.",
  "metadata": { "agentId": "uuid", "reason": "Vehicle breakdown" },
  "isRead": false,
  "createdAt": "…"
}
```

### `GET /notifications` — ADMIN

Response `200`: array of `Notification`, newest first. Errors: `403`.

### `PATCH /notifications/:id/read` — ADMIN

No body. Response `200`: the updated `Notification`. Errors: `403`, `404`.

---

## Reports

### `GET /reports/agents` — ADMIN

Aggregated delivery metrics for every agent in the admin's company.

Response `200`:

```json
[
  {
    "agentId": "uuid",
    "agentName": "Jane Smith",
    "agentEmail": "jane@swiftdrop.com",
    "totalDeliveries": 12,
    "successRate": 85.71,
    "averagePickupToDeliveryMinutes": 47.5
  }
]
```

`averagePickupToDeliveryMinutes` is `null` when there is not enough data.
Errors: `403`.

---

## Realtime

### `GET /realtime/stream` — Any authenticated

A Server-Sent Events (`text/event-stream`) stream. Delivery of events is scoped
by role:

- **ADMIN** — `parcel.updated` and `notification.created` for their company.
- **DELIVERY_AGENT** — `parcel.updated` for parcels assigned to them.
- **SUPER_ADMIN** — all `parcel.updated` events.

Example event frames:

```
data: {"type":"parcel.updated","parcel":{ "…Parcel…" }}

data: {"type":"notification.created","notification":{ "…Notification…" }}

data: {"type":"heartbeat"}
```

---

## Quick start (cURL)

```bash
# 1. Log in (public)
TOKEN=$(curl -s http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@swiftdrop.com","password":"password123"}' | jq -r .accessToken)

# 2. Call a protected endpoint
curl http://localhost:3000/parcels \
  -H 'x-api-key: dev-api-key' \
  -H "Authorization: Bearer $TOKEN"
```

### Seeded demo accounts (password: `password123`)

| Role | Email |
|------|-------|
| Super Admin | `superadmin@swiftdrop.com` |
| Admin (Swiftdrop Logistics — join code `SWIFT1`) | `admin@swiftdrop.com` |
| Admin (Metro Couriers — join code `METRO1`) | `admin@metro.com` |
| Delivery Agent | `agent@swiftdrop.com` |
