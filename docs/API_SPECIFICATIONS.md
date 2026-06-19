# ⚡ DYNAMIC CONCURRENCY CONTROLS & API SPECIFICATIONS

This engineering document details the technical specs and state-machine logic built into the Next.js App Router API architecture (`app/api/`), focusing on the high-concurrency race condition protections natively driven by Prisma's data layers.

---

## 🚀 1. The Concurrency Isolation Engine

Because the system manages time-sensitive seating layouts, parallel atomic operations are enforced at the router boundary to ensure zero database collision (double-booking protection).

### ⚙️ Mechanism A: Optimistic Concurrency Control (OCC)
* **The Problem:** Two parallel incoming requests to `/api/reserve/hold` target the exact same seat simultaneously.
* **The Action:** The application pulls the initial state where `status = "AVAILABLE"` and `version = X`. Instead of a blind update, the runtime executes a version-verified conditional payload mutation via Prisma:
  ```typescript
  // Native Prisma transaction bock executed within /api/reserve/hold
  const updateResult = await prisma.seat.updateMany({
    where: {
      id: body.seatId,
      status: "AVAILABLE",
      version: currentVersion
    },
    data: {
      status: "PENDING",
      version: { increment: 1 }
    }
  });
  ```
* **The Strategy:** If two concurrent transactions execute, the row footprint changes on the faster operation. The slower query returns `count: 0` rows affected, immediately triggering an isolation failure routine, logging a `FAILED` status event to the `AuditLog`, and short-circuiting the request before corruption cascades.

### ⚙️ Mechanism B: Distributed Session TTL Tracking
* **The Problem:** A user holds a seat via `/api/reserve/hold` but abandons the tab, freezing availability.
* **The Action:** Every valid reservation registers a specific `expiresAt` block (e.g., `now() + 10 minutes`). The global cleaning script exposed at `/api/release` runs batch sweeps that dynamically compare system execution times, automatically rolling back uncompleted sessions and resetting fields without manual intervention.

---

## 📡 2. Advanced API Routing & Lock Protocol Specifications

### 🔐 Authentication Context Cluster (`/api/auth/*`)
* `POST /api/auth/login`: Handles profile identification verification against persistent engines. Generates secure HTTP-Only authorization state strings.
* `POST /api/auth/logout`: Purges session states and flushes browser token storage scopes safely.
* `GET /api/auth/me`: Parses cryptographically signed contextual tokens to verify current caller payloads.
* `POST /api/auth/refresh`: Consumes long-lived user `refreshToken` nodes to securely prolong system permissions without password re-prompts.

### 💺 Core Inventory Metrics (`/api/seats/*`)
* `GET /api/seats`: Real-time state telemetry query endpoint. Pulls `number`, `status`, and `version` records. Directly leveraged by the automated Playwright suites via semantic locator elements (`getByRole('button', { name: number })`).

### 🛠️ Distributed Lock Controllers (`/api/reserve/*` & `/api/release*`)
* `POST /api/reserve/hold`: High-frequency transactional interface. Tries to shift a specific seat slot from `AVAILABLE` to `PENDING`. Internally invokes the Optimistic Concurrency Engine block. Generates an instant telemetry log record inside the system `AuditLog` tagged as `HOLD`.
* `POST /api/reserve/release-single`: Targeted localized recovery vector. Safely frees up an individual seat slot back to an open `AVAILABLE` status if a client explicitly cancels the payment checkout flow or the transaction fails mid-process. Records a specific telemetry event categorized as `RELEASE`.
* `POST /api/release`: Global background sanitation controller. Periodically swept by system automated runners or server-side crons to check for elapsed reservation windows (`expiresAt`). Bulk drops stale lock properties and files an aggregate transaction item to the system tracker marked as `RELEASE_EXPIRED`.

---

## 📊 3. High-Traffic Failure Resolution Matrix

| API Endpoint | Trigger Scenario | Failure Capture | System Recovery Response |
| :--- | :--- | :--- | :--- |
| `/api/reserve/hold` | Two users select the same seat at the exact same millisecond. | Prisma returns `count: 0` updated rows due to modified `version`. | Rejects the second thread payload; appends a telemetry failure entry into `AuditLog`; returns an explicit `HTTP 409 Conflict` error to the interface. |
| `/api/auth/login` | Malicious script attempts brute-force socket pool exhaustion. | Multiple rapid identical requests detected within proxy array headers. | Network firewall/rate-limiting middleware blocks originating IP footprint; logs details in telemetry structures without hitting DB tables. |
| `/api/release` | User holds a seat, moves to payment window, but closes the browser app. | Scheduler finds current time surpasses the stored `expiresAt` parameter. | Drops the invalid booking; resets the seat status back to `AVAILABLE`; logs a data event tagged under `RELEASE_EXPIRED`. |

