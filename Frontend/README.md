# Swiftdrop Dashboard

A React web app for **Swiftdrop** — a last-mile delivery management portal for admins and delivery agents.

## Prerequisites

- Node.js 20+
- Swiftdrop backend running on `http://localhost:3000`
- Database migrated and seeded (`npm run db:seed` from project root)

## Setup

```bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

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

- **Overview** — parcel counts, agent performance snapshot, retry queue size
- **Parcels** — register parcels, filter list, assign agents
- **Users** — view team, toggle agent availability
- **Retry Queue** — manage failed deliveries
- **Reports** — full agent performance metrics

## Agent portal

- **My Deliveries** — active tasks and stats
- **Parcels** — view assigned parcels
- **Parcel detail** — update status through the delivery workflow, view timeline
- **Retry Queue** — dispatch queued retries
- **Profile** — toggle availability for new assignments

## Typical workflow

1. **Admin** registers a parcel and assigns it to an available agent
2. **Agent** picks up → out for delivery → delivered (or failed attempt)
3. Failed parcels enter the **retry queue**; agent dispatches retry
4. **Admin** reviews agent reports on the Reports page

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run preview  # preview production build
```
