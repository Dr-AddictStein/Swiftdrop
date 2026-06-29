# Swiftdrop Dashboard

React web app for **Swiftdrop** — role-based admin and delivery agent portals. See the [root README](../README.md) for full project setup.

## Setup

```bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Backend must be running on `http://localhost:3000`.

## Environment

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL |
| `VITE_API_KEY` | `dev-api-key` | Must match backend `API_KEY` |

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@swiftdrop.com` | `password123` |
| Agent | `agent@swiftdrop.com` | `password123` |

## Admin portal

- **Overview** — stats, recent parcels with assigned agents, agent performance, retry queue
- **Parcels** — register, filter, assign agents; see who is handling each delivery
- **Users** — create delivery agents (name, email, password), toggle availability
- **Retry Queue** — failed deliveries with assigned agent, re-queue
- **Reports** — agent performance metrics

Parcel detail shows a **Delivery Agent** banner and timeline attribution (`by Agent Name`) for each status change.

## Agent portal

- **Dashboard** — active delivery stats
- **My Deliveries** — assigned parcel list
- **Parcel detail** — status workflow, notes, timeline
- **Retry Queue** — dispatch retries
- **Profile** — availability toggle

## Real-time updates

The dashboard maintains an SSE connection to `/realtime/stream`. Assignments and status changes appear automatically — no refresh button needed. A **Live** indicator shows when connected.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run preview  # preview production build
```
