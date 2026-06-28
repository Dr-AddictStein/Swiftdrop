# Swiftdrop Backend Implementation Guidelines

> A practical implementation guide for building a production-quality NestJS backend.

## 1. Goal

Build the backend like a senior engineer—not just to satisfy the assignment.

Priorities:

- Clean Architecture
- Maintainability
- Scalability
- Testability
- Readability

---

## 2. Tech Stack

- NestJS
- Fastify Adapter
- PostgreSQL
- Drizzle ORM
- drizzle-kit
- JWT Authentication
- API Key Guard
- class-validator
- class-transformer
- Jest
- GitHub Actions

---

## 3. Development Roadmap

### Phase 1 — Domain Design

Understand:

- Parcel
- User (Admin / Delivery Agent)
- Delivery Event

Relationships:

- One Delivery Agent → Many Parcels
- One Parcel → Many Delivery Events

---

### Phase 2 — Database Design

Tables:

- users
- parcels
- delivery_events

Users:

- id
- name
- email
- passwordHash
- role
- isAvailable
- timestamps

Roles:

- ADMIN
- DELIVERY_AGENT

Parcels:

- trackingNumber
- sender info
- recipient info
- assignedAgentId
- status

Statuses:

- REGISTERED
- PICKED_UP
- OUT_FOR_DELIVERY
- DELIVERED
- FAILED_ATTEMPT

Delivery Events:

- parcelId
- status
- remarks
- createdBy
- createdAt

Events are immutable.

---

### Phase 3 — API Design

Auth

- POST /auth/login

Users

- GET /users
- GET /users/:id
- PATCH /users/:id/availability

Parcels

- POST /parcels
- GET /parcels
- GET /parcels/:id
- PATCH /parcels/:id/assign
- PATCH /parcels/:id/status
- GET /parcels/:id/history

Delivery Events

- POST /delivery-events
- GET /delivery-events/:parcelId

Reports

- GET /reports/agents

---

### Phase 4 — Project Structure

```
src
├── common
├── config
├── database
└── modules
    ├── auth
    ├── users
    ├── parcels
    ├── delivery-events
    └── reports
```

Each module:

- controller
- service
- repository
- dto
- tests

---

### Phase 5 — Infrastructure

- Configure Fastify
- ConfigModule
- ValidationPipe
- Global Exception Filter
- Drizzle
- PostgreSQL
- First migration

---

### Phase 6 — Authentication

Implement:

- JWT Login
- JwtAuthGuard
- RolesGuard
- ApiKeyGuard

Roles:

- ADMIN
- DELIVERY_AGENT

Authorization:

Admin

- Create Parcel
- Assign Parcel
- Reports

Delivery Agent

- Update own availability
- Update assigned parcel status
- View assigned parcels

---

### Phase 7 — Parcel Module

Implement:

- Create Parcel
- Get Parcel
- List Parcels
- Assign Parcel

New parcel status:

REGISTERED

---

### Phase 8 — Delivery Events

Workflow:

1. Validate transition
2. Insert delivery event
3. Update parcel status

Wrap steps 2 and 3 inside a database transaction.

---

### Phase 9 — Status State Machine

Allowed:

REGISTERED
→ PICKED_UP
→ OUT_FOR_DELIVERY
→ DELIVERED

Failure:

OUT_FOR_DELIVERY
→ FAILED_ATTEMPT
→ OUT_FOR_DELIVERY
→ DELIVERED

Reject:

- REGISTERED → DELIVERED
- DELIVERED → PICKED_UP
- FAILED_ATTEMPT → REGISTERED

Use a transition map, not nested if statements.

---

### Phase 10 — Reporting

Return:

- Total Deliveries
- Success Rate
- Average Pickup → Delivery Time

Prefer SQL aggregation.

---

### Phase 11 — Validation

Every request uses DTOs.

Never manually validate inside services.

---

### Phase 12 — Error Handling

Global Exception Filter.

Consistent JSON response format.

---

### Phase 13 — Repository Layer

Controllers

↓

Services

↓

Repositories

↓

Drizzle

↓

Database

Repositories improve testing and separation of concerns.

---

### Phase 14 — Testing

Unit test services only.

Mock repositories.

Important tests:

- Parcel creation
- Assignment
- Status transitions
- Reporting

---

### Phase 15 — CI/CD

GitHub Actions

- Install
- Lint
- Test
- Migration Check
- Build

---

## Engineering Rules

- Thin Controllers
- Fat Services
- Immutable Delivery Events
- Repository Pattern
- DTO Validation
- Transactions for status updates
- Enum-based roles/statuses
- ConfigService instead of process.env
- Dependency Injection everywhere

---

## Git Commit Strategy

Example commits:

1. Initialize NestJS with Fastify
2. Configure Drizzle
3. Add Authentication
4. Add Users Module
5. Add Parcel Module
6. Add Assignment Logic
7. Add Delivery Events
8. Add State Machine
9. Add Reporting
10. Add Exception Filter
11. Add Tests
12. Add GitHub Actions
13. Improve README

---

## Questions to Prepare For

- Why Fastify?
- Why Drizzle?
- Why JWT?
- Why Repository Pattern?
- Why DTOs?
- Why ValidationPipe?
- Why Exception Filter?
- Why Transactions?
- Why immutable events?
- Why transition map?
- Why users table instead of delivery_agents table?
- How would you scale this?
- How would you prevent concurrent status updates?

---

## Final Checklist

- Clean architecture
- Modular design
- Authentication
- Role-based authorization
- API Key Guard
- Validation
- Global error handling
- Database migrations
- Unit tests
- Meaningful commit history
- Complete README

The goal is to produce a backend that is easy to explain during a line-by-line architecture review.
