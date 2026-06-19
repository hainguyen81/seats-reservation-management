# 🗄️ DATABASE ARCHITECTURE & ENTITY RELATIONSHIPS

This section outlines the application's actual data layout as managed via Prisma Engine, highlighting persistent tables, primary/foreign key paths, and the dynamic state-locking mechanisms.

---

## 📊 1. Entity Relationship Diagram (ASCII Schema)

     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │            User             │                 │            Seat             │
     ├─────────────────────────────┤                 ├─────────────────────────────┤
     │ PK │ id           (String)  │                 │ PK │ id           (String)  │
     │    │ username     (String)  │                 │    │ number       (String)  │
     │    │ password     (String)  │                 │    │ status       (String)  │
     │    │ refreshToken (String)  │                 │    │ version      (Int)     │
     └──────────────┬──────────────┘                 └──────────────┬──────────────┘
                    │                                               │
                    │ 1                                             │ 1
                    │                                               │
                    │ 0..*                                          │ 0..*
     ┌──────────────▼───────────────────────────────────────────────▼──────────────┐
     │                                   Booking                                   │
     ├─────────────────────────────────────────────────────────────────────────────┤
     │ PK │ id         (String)                                                    │
     │ FK │ userId     (String) ───[ References User.id ]                          │
     │ FK │ seatId     (String) ───[ References Seat.id ]                          │
     │    │ status     (String)                                                    │
     │    │ createdAt  (DateTime)                                                  │
     │    │ expiresAt  (DateTime)                                                  │
     └─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                                  AuditLog                                   │
     ├─────────────────────────────────────────────────────────────────────────────┤
     │ PK │ id          (String)                                                   │
     │    │ userId      (String?) -> Nullable for unauthorized operations          │
     │    │ action      (String)  -> HOLD, RELEASE, RELEASE_EXPIRED, etc.          │
     │    │ target      (String)  -> Target seat context (e.g., "Seats: seat-1")   │
     │    │ status      (String)  -> SUCCESS, FAILED                               │
     │    │ details     (String?)                                                  │
     │    │ ipAddress   (String?)                                                  │
     │    │ ipAddresses (String?)                                                  │
     │    │ createdAt   (DateTime)                                                 │
     └─────────────────────────────────────────────────────────────────────────────┘

---

## 📝 2. Data Dictionary & System Capabilities

### 🔹 A. User Table
* Holds application authentication states and maps individual accounts to billing workflows.
* **Key Fields:** `username` (Unique string for login), `password` (Hashed verification string), and `refreshToken` (Session persistence state management).

### 🔹 B. Seat Table (High-Concurrency Resource Node)
* Models individual physical seat points linked directly into the validation and reservation lifecycle.
* **High-Concurrency Controls:**
  * `status`: Tracks immediate visibility states: `AVAILABLE`, `PENDING`, or `BOOKED`. Used natively by the Playwright engine via UI accessible locator mappings (`getByRole('button', { name: number })`).
  * `version`: Used for **Optimistic Locking**. Prevents race conditions during concurrent bulk-checkout selections by incrementing and validating version tokens on update mutations.

### 🔹 C. Booking Table (Transaction & Ticket Gateway)
* Acts as the relational link model connecting a specific `User` with an isolated `Seat`.
* **Transactional State Logic:**
  * `status`: Moves down the checkout funnel via `PENDING`, `COMPLETED`, or `FAILED` validation metrics.
  * `expiresAt`: Establishes temporal boundaries. Unpaid transactions that surpass this timestamp trigger automatic rollback workers to unlock reserved slots.

### 🔹 D. AuditLog Table (Security & Telemetry Analytics)
* Keeps immutable historical tracing loops of all dynamic cluster modifications, capturing system diagnostics, webhook events, and security telemetry.
* **Core Identifiers:**
  * `action`: Records fine-grained operational lifecycles: `HOLD`, `RELEASE`, `RELEASE_EXPIRED`, `PAYMENT_SUCCESS`, `PAYMENT_FAIL`.
  * `target`: Isolates context tracking targets (e.g., `"Seats: seat-1, seat-2"`).
  * `ipAddresses`: Implements proxy-aware request origin logging via parsed proxy header arrays.
