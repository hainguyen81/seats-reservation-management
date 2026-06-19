# Seats Reservation Platform

## 🏛️ 1. Technical Decisions & Architecture
- **Concurrency Control**: DB level transactional isolation to completely eliminate double-booking at the exact same millisecond.
- **Session Duration**: Mandated 90-day expiry using HTTP-Only JWT tokens for security.
- **Resiliency & Fault Tolerance**: Includes a 5-minute timeout window pattern on pending seats to gracefully release deadlocks if users abandon the payment popup screen.


---

## 🔐 2. Authentication & Identity Management Architecture

The platform implements a highly resilient, hybrid identity management architecture controlled via a **Dynamic Feature Toggle (`AUTH_PROVIDER`)**. This architecture supports runtime switching between two enterprise-grade authentication modes:
1. **Cloud-Native Mode (`firebase`)**: Offloaded authentication utilizing the Firebase Session Cookie Pattern.
2. **Self-Managed Mode (`custom`)**: An in-house, dual-token infrastructure featuring cryptographic isolation and token rotation.

---

### ☁️ Mode 1: Cloud-Native Identity (Firebase Session Cookie Pattern)
To eliminate the security vulnerabilities of standard client-side SDK implementations—where ID tokens stored in LocalStorage are exposed to Cross-Site Scripting (XSS) attacks—this platform strictly enforces the **Server-Side Session Cookie Pattern**.

* **Token Exchange**: The frontend SDK captures a short-lived Firebase `IdToken` and transmits it to the Next.js backend. The `firebase-admin` SDK validates the token and exchanges it for a secure, HTTP-Only Session Cookie with a 14-day validity window.
* **Zero Layout Flickering**: Because sessions are decrypted server-side during the initial page request, the platform avoids the 1-2 second UI flickering typical of client-side `onAuthStateChanged` hooks. This ensures instant hydration of the user's `SELECTED` seat states and active countdown timers upon browser refreshes.
* **Operational Decoupling**: Offloading brute-force protection, password encryption, and account recovery to Google's infrastructure allows the platform's core to dedicate 100% of its resources to ACID-isolated concurrent seat allocation.

#### 🛡️ Client-Side Firebase API Key Security Disclosure
The client-side `apiKey` utilized within the Firebase Client configuration differs fundamentally from conventional API keys, which are typically used to restrict backend resources. Instead, it functions purely as a public **Project Identifier** that enables the frontend application to route requests to the designated Google infrastructure.

Data confidentiality and operational integrity (including read/write loops and state mutations within the seat reservation matrix) are strictly enforced via standard defensive layers:
1. **Server-Side Session Verification**: Authenticated through `firebase-admin` via secure, HTTP-Only session cookies.
2. **Database Integrity**: Protected by server-managed ACID transactions that eliminate concurrent race conditions.

Consequently, exposing the `apiKey` within the client-side bundle complies with Google’s architectural specifications and introduces zero vulnerability to the core security posture of the platform.

#### 📊 Client-Side Telemetry & Firebase Analytics Integration

The platform integrates **Firebase Analytics** to capture user behavioral metrics and conversion funnels (such as seat selections and checkout completions) without introducing render-blocking delays to the UI.

To prevent build-time failures and server runtime crashes during Next.js Pre-rendering (SSR), the application implements a strict **Isomorphic Safe Initialization Pattern**:
1. **Runtime Context Guard**: The initialization query is explicitly wrapped within a `typeof window !== "undefined"` conditional block, insulating the Node.js server context from web-browser-native variables.
2. **Feature Support Verification**: Utilizes Firebase’s asynchronous `isSupported()` interface to safely suppress tracking on strict storage environments, legacy browsers, or aggressive stealth/incognito viewports.
3. **Out-of-Band Event Dispatching**: High-value client events (e.g., `purchase_seats`) are dispatched asynchronously using non-blocking telemetry primitives, decoupled from the critical path of the local transactional database state machine.

---

### 🛡️ Mode 2: Self-Managed Identity (Dual-Token JWT & Cryptographic Isolation)
When operating in decoupled or on-premise environments, the platform switches to a custom, zero-dependency identity layer engineered for high security and performance.

* **Cryptographic Hardening**: Password data is transformed into mathematically un-verifiable hashes using **Bcrypt** with a computational work factor of 10 (`SALT_ROUNDS`). This proactively thwarts rainbow-table and high-throughput GPU brute-force attempts.
* **Dual-Token Pipeline**:
  * **Access Token**: A short-lived JWT (15-minute expiry) benched with standard cryptographic signatures (`HS256`), attached to backend mutation requests.
  * **Refresh Token**: A long-lived token (90-day expiry) encapsulated within an HTTP-Only Cookie and cross-referenced with a secure database whitelist.
* **Silent Token Rotation**: When the short-lived Access Token expires, the backend automatically triggers a silent refresh handshake. It validates the client's Refresh Token against the database snapshot; if valid, a new Access Token is minted transparently without interrupting the user's active seating countdown.
* **Instant Session Revocation**: Storing the Refresh Token string directly in the database gives administrators an instant kill-switch. By setting the token to `null` in the user's row, any active session is immediately revoked on its next rotation attempt, enforcing strict state control.

---

### 🎛️ Hybrid Architecture Governance
Both authentication subsystems converge into a single defensive interface (`verifyAccessToken()`). All downstream seat booking endpoints—such as `/api/reserve/hold` and `/api/reserve`—interact with this unified contract, remaining entirely agnostic of the underlying auth provider. This strict separation of concerns allows developers to swap the entire identity core via environment variables (`.env`) without refactoring a single line of business logic.

---

## 💻 3. Local Setup Instructions
1. Clone the project and install packages:
   ```bash
   npm install
   ```
2. Initialize SQLite Database & Seed some sample seats:
   ```bash
   npx prisma db push
   ```
3. Run Seed Script (or execute inside your db tool) to create 3 seats: `SEAT-1`, `SEAT-2`, `SEAT-3`.
4. Start development web server:
   ```bash
   npm run dev										# no seeding sample data - DEV mode
   or npm run dev_seed								# with seeding sample data - DEV mode
   ```
5. Open browser at `http://localhost:3000` to evaluate.
6. Optional: you could run by MS DOS batch under Windows platform
   ```bash
   # DEV Mode
   run-dev.bat build								# MS Dos batch script (included step 1,2) without seeding sample data / with build to install dependencies
   or run-dev-seed.bat build						# MS Dos batch script (included step 1,2) with seeding sample data (user: hainguyenjc@gmail.com; password: password123) / with build to install dependencies

   # PROD Mode
   run-prod.bat build								# MS Dos batch script (included step 1,2) without seeding sample data / with build to install dependencies
   or run-prod-seed.bat build						# MS Dos batch script (included step 1,2) with seeding sample data (user: hainguyenjc@gmail.com; password: password123) / with build to install dependencies
   ```
7. Optional (Docker/K8s): you could run by MS DOS batch to deploy and run under Docker/K8s platform
   ```bash
   docker-compose-up.bat							# for SQLite		- build image with cache
   or docker-compose-up.bat postgres				# for PostgreSQL	- build image with cache
   docker-compose-up.bat sqlite --no-cache			# for SQLite		- build image without cache, fresh build
   or docker-compose-up.bat postgres --no-cache		# for PostgreSQL	- build image without cache, fresh build	
   ```

---

## 💳 4. Payment Webhook Reliability & Fallback Architecture

### Current Staging Implementation
The platform currently utilizes a client-triggered proxy (`mockPaymentSuccess`) within the `/api/reserve` endpoint to simulate payment outcomes. While highly efficient for local integration testing and instant state transition verification, this synchronous approach introduces a single point of failure and does not meet enterprise production standards for asynchronous financial reconciliation.

### Production-Ready Target Architecture: Idempotent Event-Driven Webhook
To ensure **100% financial reliability, network fault tolerance, and eventual consistency**, the production blueprint replaces the mock layer with an asynchronous, decoupled Webhook architecture integrated with payment gateways (e.g., Stripe, PayPal, or local banking APIs).

```text
+----------------+      1. Hold Seat      +------------------+      2. Checkout Session     +-----------------+

|   Web/Mobile   | ---------------------> |  Next.js Server  | ---------------------------> | Payment Gateway |
+----------------+                        +------------------+                              +-----------------+
        ^                                           |                                                |

        |                                           | 4. Update State                                | 3. Webhook Event
        +-------------------------------------------+ <----------------------------------------------+
                                                  (ACID/Idempotent)
```

---

### 🛡️ Core Reliability & Resiliency Patterns

#### 4.1. Strict Idempotency Layer (Duplicate Event Protection)
Payment gateways often guarantee **At-Least-Once delivery**, meaning the same webhook event (e.g., `payment_intent.succeeded`) can be fired multiple times due to network retries.
* **Implementation**: The backend introduces an idempotency verification layer using a unique `PaymentIntentID` or `TransactionID` as a locking key.
* **Mechanism**: Before processing mutations inside the database transaction, the server performs a check-and-set operation. If the transaction ID is already flagged as `COMPLETED` or `FAILED`, the server immediately skips execution and returns a `200 OK` handshake response to the gateway, preventing duplicate billing or multiple seat assignments.

#### 4.2. Cryptographic Webhook Signature Verification
To thwart **Replay Attacks** and prevent malicious actors from spoofing successful payment payloads to unblock seats without paying:
* The server extracts the `X-Webhook-Signature` header from the incoming request.
* Using a secure, server-side environment secret (`WEBHOOK_SIGNING_SECRET`), the runtime recalculates the HMAC-SHA256 checksum of the raw request body.
* The hook is strictly rejected with a `400 Bad Request` if the computed signature does not perfectly match the header payload.

#### 4.3. Dead-Letter Queue (DLQ) & Retry Fallback Mechanics
Network instability or transient database deadlocks can cause webhook ingestion to fail mid-flight.
* **Exponential Backoff**: The system relies on the payment gateway's native exponential backoff retry mechanism (e.g., retrying 3 to 5 times over 24 hours).
* **Decoupled Message Broker**: In ultra-high-concurrency scenarios, the webhook landing endpoint acts as a lightweight producer that shoots raw event payloads into a durable message queue (such as **RabbitMQ**, **AWS SQS**, or **Kafka**).
* **DLQ Remediation**: If a message fails ingestion after maximum retry attempts, it is quarantined inside a **Dead-Letter Queue (DLQ)**. This triggers an automated alert to operators for manual audit or programmatic fallback correction without dropping customer data.

#### 4.4. Asynchronous State Reconciliation (The Ultimate Fallback)
If a payment gateway suffers a catastrophic outage and fails to fire webhooks entirely, the platform’s **Passive Sweeper Logic** (`/api/seats`) and **Active Background Worker** (`/api/release`) act as safety nets [^2, 3]:
* **Reconciliation Cron**: A scheduled server cron job runs every 10 minutes to query the payment gateway's data logs for any bookings stuck in a permanent `PENDING` state.
* **State Harmonization**: If the gateway logs report the payment was successful but no webhook arrived, the cron programmatically transitions the seat to `BOOKED` and completes the order [^2], maintaining absolute eventual consistency across all edge distributed node clusters.

---

## 🕵️ 5. Audit Logging for Financial & Critical Mutations

### Architectural Mandate
To comply with enterprise security auditing, financial reconciliation, and anomaly detection standards, the platform features an asynchronous, **Append-Only Audit Logging Infrastructure**. 

This component acts as an immutable ledger designed to monitor and store data related to high-risk business state changes without introducing performance overhead to the primary seating pipeline.

---

### 🛡️ Core Audit System Specifications

#### 1. Tamper-Proof & Append-Only Topology
* **Structural Isolation**: The `AuditLog` database entity behaves as a data-sink. The backend service architecture purposefully exposes no `Update` or `Delete` endpoints for this model.
* **Fail-Safe Mechanism**: The logging layer is isolated with dedicated error-handling boundaries. If the storage persistence layer of the log fails, the core system gracefully intercepts the error, emits a system warning (`console.error`), and permits the user’s primary financial transaction to proceed uninterrupted.

#### 2. Deep Network Forensics & IP Traversal
To enforce non-repudiation and defend against malicious automated scripts or distributed attacks, the logger extracts metadata passing through Kubernetes Ingress or reverse-proxies:
* It reads headers like `X-Forwarded-For` and `X-Real-IP`.
* In multi-proxy routing environments, it programmatically parses the composite string to isolate the origin client IP address.

#### 3. Structured Behavioral Telemetry
Each generated log captures a strict, standardized state dictionary:
* `action`: High-level operational type classification (`HOLD_SEAT`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`).
* `target`: Clear text representation of the mutated resources (e.g., `Seats: seat-1, seat-2`).
* `details`: A comprehensive JSON payload capturing contextual data, exception trace messages, or raw webhook identifiers for subsequent cross-referencing.

---

## ❓ 6. Architectural Q&A: Session Management & Future Mobile App Support

### ❓ 6.1. Question:
**Does the current session approach have the ability to handle a mobile app integration in the future?**

### 💡 6.1. Answer:
**Yes, absolutely.** The core authentication architecture of this platform was engineered from day one to be completely **stateless and API-first**, ensuring seamless horizontal scalability across multiple client channels, including **Web, iOS, Android, and third-party API integrations**.

---

### 🧠 6.1. Detailed Architectural Scalability & Implementation Strategy

To satisfy enterprise-grade mobile requirements, the platform deliberately avoids traditional, stateful server-side sessions (such as Redis-backed or sticky session stores). Instead, it implements a strict **Stateless Dual-Token Framework (JWT Access Token + Refresh Token)**:

#### 6.1.1. Decoupled Token Storage Strategy
While the Web client securely encapsulates tokens within `HTTP-Only, SameSite=Lax` Cookies to mitigate Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) vulnerabilities, the mobile client is decoupled from browser-native cookie management:
* **iOS / Android Clients**: Mobile applications will receive the exact same cryptographic tokens (Access & Refresh JWTs) in the JSON payload response during the authentication handshake.
* **Secure Device Hardware**: The mobile application will securely persist these tokens inside hardware-backed keychains (e.g., **iOS Keychain Services** or **Android Keystore / EncryptedSharedPreferences System**).
* **Authorization Headers**: For subsequent resource requests or seat matrix mutations, the mobile client will attach the Access Token inside the standard HTTP `Authorization: Bearer <JWT>` header, ensuring total compatibility with the existing backend parsing logic.

#### 6.1.2. Cross-Platform Token Rotation Loop
The backend's **Silent Token Rotation** endpoint (`/api/auth/refresh`) is completely decoupled from Web context [^8]:
* When a mobile user’s short-lived Access Token expires (15-minute window), the mobile networking layer (e.g., Axios Interceptors or Retrofit Authenticator) will automatically catch the `401 Unauthorized` status.
* The client will fire a headless POST request containing the Refresh Token to the rotation endpoint.
* Once cross-referenced with the database whitelist, the server mints a new token pair and returns it in the response body [^8]. This guarantees a zero-friction, uninterrupted seat booking experience on mobile devices.

#### 6.1.3. API-First Architecture Readiness
Because the backend endpoints—such as `/api/reserve/hold` and `/api/reserve`—rely entirely on a stateless contract contract interface (`verifyAccessToken()`), they are fully agnostic of the client’s architecture. 

```text
+-----------------------+      (HTTP-Only Cookie)      +---------------------------------+

|       Web App         | <--------------------------> |                                 |
+-----------------------+                              |                                 |

                                                       |      Next.js API Gateway        |
+-----------------------+    (Authorization Header)    |  (Stateless Token Verification) |

|   Mobile App (iOS)    | <--------------------------> |                                 |
+-----------------------+                              +---------------------------------+
```

#### 6.1.4. Unified Firebase Support for Mobile
When operating in Cloud-Native Mode (`AUTH_PROVIDER="firebase"`), migrating to mobile introduces zero backend friction. The native iOS/Android Firebase SDKs will authenticate users directly against Google OAuth endpoints. The generated `IdToken` will then be transmitted to our API gateway via raw request bodies to establish the same verified session context.

---

### 🏁 6.1. Summary of Architectural Alignment
By adopting a **Stateless Token Pipeline** rather than traditional server-bound cookie sessions, the platform eliminates infrastructure lock-in. This delivers a unified, production-ready backend capable of powering responsive desktop layouts and native mobile viewports under a single, shared security blueprint.

---

### ❓ 6.2. Question:
**How would you handle a failed webhook from the payment gateway?**

### 💡 6.2.Answer:
Handling a failed webhook requires a multi-layered defensive strategy to ensure **eventual consistency** and prevent deadlocks (where a seat remains permanently locked in `PENDING` status or a user pays but never gets their seat) [^2, 3]. 

The platform guarantees data reconciliation and transactional recovery through four coordinated engineering patterns:

#### 6.2.1. Native Exponential Backoff Retries
Most modern payment gateways (e.g., Stripe, Adyen) do not expect an immediate single handshake. If our server fails to return a `200 OK` response due to transient network drops or database lock contention, the gateway automatically queues the webhook for retry using an exponential backoff strategy (e.g., retrying up to 3–5 times over a 24-hour window). 
* *System Behavior*: Our endpoint relies on an **Idempotency Layer**. If a previous partial transaction failed and rollbacked, the subsequent retry will safely execute the query from scratch without side effects.

#### 6.2.2. Event Ingestion via Durable Message Broker (Queue Decoupling)
In a high-concurrency production scenario, the webhook landing endpoint does not process business logic or communicate with the database directly. 
* *Mechanism*: The HTTP POST request simply pushes the raw payload into a message broker (such as **RabbitMQ** or **AWS SQS**). 
* *Failure Mitigation*: If our Next.js backend crashes or suffers a temporary outage, the message remains safely persisted inside the queue. Once the backend services recover, they consume the message from the queue sequentially, ensuring no user financial events are permanently dropped [^8].

#### 6.2.3. Proactive Self-Healing & Asynchronous Sweep Logic (The Ultimate Fallback)
If the payment gateway suffers an internal disaster and completely fails to broadcast webhooks, the system activates its dual passive/active sweeping architecture to prevent seating state deadlocks [^2, 3]:
* **Passive Evaluation on Request**: Every time any user hits the `/api/seats` endpoint, the server runs a sub-millisecond query to locate any `PENDING` bookings that have outlived their 5-minute lifespan (`expiresAt < NOW()`) and automatically reverts those seats back to `AVAILABLE` [^2, 3].
* **Active Reconciliation Cron (Out-of-Band Sync)**: A scheduled microservice worker runs every 10 minutes, pulling all `PENDING` rows close to expiration. It makes an outbound secure REST API request directly to the payment gateway's logs (e.g., GET `/v1/payment_intents/id`) to verify the factual status. If the gateway reports the transaction was successful, our script bypasses the missing webhook, upgrades the seat to `BOOKED`, and confirms the order [^2].

#### 6.2.4. Dead-Letter Queue (DLQ) & Observability Guardrails
If a webhook payload contains malformed data or fails processing after maximum message broker retries, it is quarantined inside a **Dead-Letter Queue (DLQ)**.
* *Alerting*: The mutation triggers an automated Slack/PagerDuty notification to the DevOps team.
* *Governance Tooling*: Administrative operators can access a secure internal dashboard to review the structural anomaly of the isolated payload and trigger a manual, programmatic force-sync once the underlying data structure issue is remediated.

---

## 🤖 7. Automated End-to-End (E2E) Testing Suite

The platform packages a production-ready **Playwright** automation suite to perform end-to-end regression testing on the core distributed business state machine.

### Test Coverage Blueprint
The automated matrix simulates headless user actors to validate non-deterministic edge scenarios:
1. **Defensive Authorization Barrier**: Verifies the dynamic locking layer blocks access to the database seating configuration for unauthenticated connections.
2. **Concurrent Multi-Select Mechanics**: Automates multi-row selection, verifying asynchronous array parsing (`seatIds`) across runtime memory.
3. **Reactive Telemetry & Timeouts**: Decodes regex timestamp primitives to ensure the countdown timer accurately hooks into the server-defined `expiresAt` window.
4. **State Machine Transitions**: Simulates the payment reconciliation loop, executing cross-platform verification that successful gates transition seats to disabled `BOOKED` structures, while failures gracefully execute rollback workflows.

### Execution Instructions
To execute the automated regression test matrix locally, instantiate the test runner via:
```bash
# Install framework binaries
npm install

# Run the test matrix in headless parallel threads
npx playwright test

# Launch the visual reporting dashboard
npx playwright show-report
```

### Test Result
1. Running 2 tests using 1 worker
  2 passed (4.2s)

2. To open last HTML report run:
  ```bash
  npx playwright show-report
  ```

---

> [!TIP]
> ### 💡 Core Rule to Avoid Future Confusion
>
> * **When running with Docker Compose (Local Machine or Production Environment):** 
>   Containers share an isolated, internal Docker virtual network. Therefore, you must use the service name as the hostname (e.g., `redis://redis-cache:6379`).
> * **When running commands directly from a GitHub Actions Workflow:** 
>   Commands execute directly on the host runner (outside the container network) and communicate through mapped ports. Consequently, all backing services (`postgres`, `redis`, `mongodb`, etc.) must be accessed via **`localhost`**.
>
> ### 🚀 Production Scaling Strategy (K8s & Cloud Architecture)
>
> The repository comes fully equipped with production-ready codebase architectures designed for horizontal scaling. Follow these infrastructural patterns when transitioning from Docker Compose to Kubernetes (K8s):
>
> * **K8s Load Balancer & Pod Autoscaling (HPA):** 
>   The stateless Next.js/Node layers are configured to scale horizontally via `HorizontalPodAutoscaler` (HPA) based on CPU/Memory thresholds. Ensure your K8s Ingress is backed by a cloud-managed **LoadBalancer** to distribute incoming traffic evenly across dynamically scaling replica Pods.
>
> * **Database Replication Matrix:** 
>   To support intense read traffic, the database connection layer is architected to separate Read/Write transactions. In a K8s production environment, route all `mutations` (Write) to your Primary Database instance, and leverage multi-availability zone **Database Replicas** for handling `queries` (Read) via dedicated read-replica pooling.
>
> * **Distributed Caching (Redis):** 
>   As Pods scale up and down dynamically, memory state cannot be local. **Redis** serves as the centralized, shared infrastructure layer handling session stores, rate-limiting, and real-time pub/sub mechanisms across all parallel microservice nodes.
>
> * **Firebase Serverless Operations:** 
>   File uploads, assets hosting, and client-side notifications bypass the main server compute footprint entirely. They leverage direct, secure client-to-cloud tokens to guarantee low latency and optimize compute resource usage.


