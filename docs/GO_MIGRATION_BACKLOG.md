# Go Backend Migration Backlog

This document outlines the remaining features, logic, and database schemas that exist in the legacy Node.js/Prisma server but have **not yet been implemented** in the new Golang (`server-go`) architecture.

This serves as the master checklist to achieve 100% feature parity.

---

## 1. Database Schema & Models Gap

The initial Go migration (`goose`) is missing several advanced entities and relationships present in the original Prisma schema.

### Missing Tables:

- [ ] `OperatorDetails`: Specific profile details for Admin/Operator roles.
- [ ] `AssetMaintenanceLog`: History of maintenance/repairs for assets.
- [ ] `Complaint`: Ticketing system for tenant complaints (Asset vs Others).
- [ ] `RoomOccupancySnapshot`: Analytical records of occupied vs vacant rooms per month.

### Missing Columns & Enums:

- [ ] **User**: `deletedAt` (Implement Soft-Delete functionality).
- [ ] **Invoice**: `importCode`, `isDpReservation`, `waitingForRoomVacant`, `priorOccupantId` (Crucial for the DP/Waitlist system).
- [ ] **Payment**: `importCode`, `paymentDate`, `paymentMethod`.
- [ ] **FinancialRecord**: `date`, `expenseCategory`, `assetId` (Tying repair expenses directly to assets).
- [ ] **Enums**: `MaintenanceStatus`, `ComplaintCategory`, `ComplaintStatus`, `PaymentMethod`, `ExpenseCategory`, `OccupantOccupation`.

---

## 2. Middlewares & Security (RBAC)

- [ ] **Role-Based Access Control (RBAC):** Implement an `authorizeRole(roles...)` middleware in Go (Chi) to restrict endpoints (e.g., preventing OCCUPANT from accessing ADMIN routes).

---

## 3. Standard CRUD Endpoints

Currently, `server-go` only supports `GET` (Read) operations. We need to implement the full Create, Update, and Delete lifecycles:

- [ ] **Admin/Users**: Create Operator, Create Occupant, Update Profiles, Soft-Delete Users.
- [ ] **Rooms**: Create, Update, Delete Rooms.
- [ ] **Asset Masters**: Create, Update, Delete Asset Catalogs.
- [ ] **Maintenance**: Create, Update, Delete Maintenance Logs (`/maintenance/:assetId`).
- [ ] **Complaints**: Admin endpoints to read all, process, and resolve complaints.
- [ ] **Finance**: Record manual payments, Create/Update Expenses.

---

## 4. Tenant Portal (Occupant Features)

Endpoints specific to the logged-in tenant:

- [ ] `GET /api/v1/auth/me`: Get current logged-in user profile.
- [ ] `GET /api/v1/tenant/my-assets`: List assets in the tenant's current room.
- [ ] `GET /api/v1/tenant/my-invoices`: List tenant's billing history.
- [ ] `GET /api/v1/tenant/my-complaints`: List tenant's submitted complaints.
- [ ] `POST /api/v1/tenant/complaints`: Submit a new complaint.

---

## 5. Core Business Logic (Room Occupancy Flow)

This is the most complex part of the system (verified by a 41KB integration test in the legacy codebase).

- [ ] **Checkout Process (`PATCH /rooms/:id/checkout`)**: Logic to handle a tenant leaving a room.
- [ ] **DP & Reservation System**: Logic to handle a new tenant paying a Down Payment (DP) for a room that is currently occupied.
- [ ] **Waitlist Auto-Activation**: When the current tenant checks out, the system must automatically transition the reserving tenant from `waitingForRoomVacant` to active, and update the invoice periods.
- [ ] **Period Normalization**: Adjusting invoice and billing dates when tenants move in during the middle of the month.

---

## 6. Background Jobs (Cron / Scheduler)

- [ ] **Auto-Invoice Generator (Daily at 00:00)**: Checks if any active invoice expires in $\le$ 3 days. If so, automatically generates a new `UNPAID` invoice for the next month.
- [ ] **Occupancy Snapshot (Monthly on the 1st at 00:05)**: Calculates the total occupied vs vacant rooms for the previous month and saves it to `RoomOccupancySnapshot` for dashboard analytics.
- [ ] **Snapshot Backfill API**: An endpoint (`POST /occupancy-snapshots/backfill`) to manually recalculate and fill missing historical snapshot data.

---

## 7. Dashboard Analytics

- [ ] `GET /api/v1/dashboard/summary`: Aggregate income, expenses, and occupancy rates.
- [ ] `GET /api/v1/dashboard/occupancy-snapshots`: Fetch historical data for charts.

---

## 🚀 Implementation Plan (Execution Strategy)

To systematically address the backlog above and achieve 100% feature parity with the legacy Node.js server, we will execute the migration in the following phased approach:

### Phase 1: Database Synchronization & Code Generation

_Goal: Establish a 1:1 structural match with the legacy database._

1. Create a new `goose` migration file to add missing tables (`OperatorDetails`, `AssetMaintenanceLog`, `Complaint`, `RoomOccupancySnapshot`).
2. Add missing enums and columns (e.g., `isDpReservation`, `deletedAt`) to existing tables via `ALTER TABLE`.
3. Update `db/queries` with all required SQL commands.
4. Re-run `make sqlc` to update the Go structs and repository layer.

### Phase 2: Security & Routing Realignment

_Goal: Secure the endpoints and match the Frontend's expected URLs._

### Phase 2: Security & Frontend Alignment

_Goal: Secure the endpoints and align the Frontend with the new API versioning._

1. Implement the `authorizeRole` middleware to enforce RBAC (Admin, Operator, Occupant).
2. Refactor `chi` router paths from `/api/v1/*` to match the exact paths expected by the React frontend (`/api/admin/*`, `/api/occupant/*`, `/api/auth/*`, `/api/complaints/*`).
3. Implement the `GET /api/auth/me` endpoint.
4. Refactor the Frontend React codebase (e.g., `client/src/lib/api/client.ts`) to adapt to the new industry-standard backend versioning (`/api/v1/...`).
5. Implement the `GET /api/v1/auth/me` endpoint.
6. Refactor the Frontend React codebase (e.g., `client/src/lib/api/client.ts`) to adapt to the new industry-standard backend versioning (`/api/v1/...`).
7. Implement the `GET /api/v1/auth/me` endpoint.
8. Refactor the Frontend React codebase (e.g., `client/src/lib/api/client.ts`) to adapt to the new industry-standard backend versioning (`/api/v1/...`).
9. Implement the `GET /api/v1/auth/me` endpoint.

### Phase 3: Standard CRUD Expansion

_Goal: Enable basic data management._
_Goal: Build out basic management routes for all core entities._

1. Complete User Management (Create/Update/Delete Operators & Occupants).
2. Complete Asset Master and Maintenance Log CRUD.
3. Complete Complaint Management (Tenant submission & Admin resolution).
4. Complete basic Room and Finance (Expenses) CRUD.
5. [x] Complete User Management (Create/Update/Delete Operators & Occupants).
6. [x] Complete Asset Master and Maintenance Log CRUD.
7. [x] Complete Complaint Management (Tenant submission & Admin resolution).
8. [x] Complete basic Room and Finance (Expenses) CRUD.
9. [x] Complete User Management (Create/Update/Delete Operators & Occupants).
10. [x] Complete Asset Master and Maintenance Log CRUD.
11. [x] Complete Complaint Management (Tenant submission & Admin resolution).
12. [x] Complete basic Room and Finance (Expenses) CRUD.
13. [x] Complete User Management (Create/Update/Delete Operators & Occupants).
14. [x] Complete Asset Master and Maintenance Log CRUD.
15. [x] Complete Complaint Management (Tenant submission & Admin resolution).
16. [x] Complete basic Room and Finance (Expenses) CRUD.
17. [x] Complete User Management (Create/Update/Delete Operators & Occupants).
18. [x] Complete Asset Master and Maintenance Log CRUD.
19. [x] Complete Complaint Management (Tenant submission & Admin resolution).
20. [x] Complete basic Room and Finance (Expenses) CRUD.

### Phase 4: Core Business Logic & Transactions

_Goal: Port the complex room timeline and financial operations._

1. Implement `PATCH /api/admin/rooms/:id/checkout` (Room release logic).
2. Implement the DP & Waitlist logic inside Invoice generation.
3. Implement `POST /api/admin/payments/transaction` (Payment processing).
4. Implement `POST /api/admin/financial/backfill-income`.

### Phase 5: Schedulers & Background Jobs (Cron)

_Goal: Automate system processes natively in Go._

1. Install a robust Go cron scheduler (e.g., `github.com/robfig/cron/v3`).
2. Replicate `paymentScheduler.ts` to auto-generate invoices daily at `00:00`.
3. Replicate `occupancySnapshotService.ts` to capture monthly room analytics on the 1st of every month at `00:05`.
4. Expose the manual trigger and backfill analytics endpoints.

### Phase 6: Final Testing & Frontend Integration

_Goal: Ensure seamless integration with the existing Frontend._

1. Boot up the React frontend and configure it to point to the Go server (`localhost:8080`).
2. Run end-to-end user flows (Login -> Submit Complaint -> View Invoice -> Checkout) directly from the UI.
