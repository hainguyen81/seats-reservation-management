# Seats Reservation Platform

---

## 🔐 1. Technical Decisions & Architecture
- **Concurrency Control**: DB level transactional isolation to completely eliminate double-booking at the exact same millisecond.
- **Session Duration**: Mandated 90-day expiry using HTTP-Only JWT tokens for security.
- **Resiliency & Fault Tolerance**: Includes a 5-minute timeout window pattern on pending seats to gracefully release deadlocks if users abandon the payment popup screen.


---

## 🔐 2. Authentication & Identity Management Architecture

The platform implements a highly resilient, hybrid identity management architecture controlled via a **Dynamic Feature Toggle (`AUTH_PROVIDER`)**. This architecture supports runtime switching between two enterprise-grade authentication modes:
1. **Cloud-Native Mode (`firebase`)**: Offloaded authentication utilizing the Firebase Session Cookie Pattern.
2. **Self-Managed Mode (`custom`)**: An in-house, dual-token infrastructure featuring cryptographic isolation and token rotation.

---

### 🏛️ Mode 1: Cloud-Native Identity (Firebase Session Cookie Pattern)
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

## 🔐 3. Local Setup Instructions
1. Clone the project and install packages:
   ```bash
   npm install
   ```
2. Initialize SQLite Database & Seed 3 seats:
   ```bash
   npx prisma db push
   ```
3. Run Seed Script (or execute inside your db tool) to create 3 seats: `SEAT-1`, `SEAT-2`, `SEAT-3`.
4. Start development web server:
   ```bash
   npm run dev
   ```
5. Open browser at `http://localhost:3000` to evaluate.
6. Optional: you could run by MS DOS batch under Windows platform
   ```bash
   run-dev.bat # no seeding sample data
   or run-dev-seed.bat # include seeding sample data (user: hainguyenjc@gmail.com; password: password123)
   ```
7. Optional (Docker/K8s): you could run by MS DOS batch to deploy and run under Docker/K8s platform
   ```bash
   docker-compose-up.bat # for SQLite
   or docker-compose-up.bat postgres # for PostgreSQL
   ```

---

## ❓ 4. Architectural Q&A: Session Management & Future Mobile App Support

### Question:
**Does the current session approach have the ability to handle a mobile app integration in the future?**

### Answer:
**Yes, absolutely.** The core authentication architecture of this platform was engineered from day one to be completely **stateless and API-first**, ensuring seamless horizontal scalability across multiple client channels, including **Web, iOS, Android, and third-party API integrations**.

---

### 🏛️ Detailed Architectural Scalability & Implementation Strategy

To satisfy enterprise-grade mobile requirements, the platform deliberately avoids traditional, stateful server-side sessions (such as Redis-backed or sticky session stores). Instead, it implements a strict **Stateless Dual-Token Framework (JWT Access Token + Refresh Token)**:

#### 4.1. Decoupled Token Storage Strategy
While the Web client securely encapsulates tokens within `HTTP-Only, SameSite=Lax` Cookies to mitigate Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) vulnerabilities, the mobile client is decoupled from browser-native cookie management:
* **iOS / Android Clients**: Mobile applications will receive the exact same cryptographic tokens (Access & Refresh JWTs) in the JSON payload response during the authentication handshake.
* **Secure Device Hardware**: The mobile application will securely persist these tokens inside hardware-backed keychains (e.g., **iOS Keychain Services** or **Android Keystore / EncryptedSharedPreferences System**).
* **Authorization Headers**: For subsequent resource requests or seat matrix mutations, the mobile client will attach the Access Token inside the standard HTTP `Authorization: Bearer <JWT>` header, ensuring total compatibility with the existing backend parsing logic.

#### 4.2. Cross-Platform Token Rotation Loop
The backend's **Silent Token Rotation** endpoint (`/api/auth/refresh`) is completely decoupled from Web context [^8]:
* When a mobile user’s short-lived Access Token expires (15-minute window), the mobile networking layer (e.g., Axios Interceptors or Retrofit Authenticator) will automatically catch the `401 Unauthorized` status.
* The client will fire a headless POST request containing the Refresh Token to the rotation endpoint.
* Once cross-referenced with the database whitelist, the server mints a new token pair and returns it in the response body [^8]. This guarantees a zero-friction, uninterrupted seat booking experience on mobile devices.

#### 4.3. API-First Architecture Readiness
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

#### 4.4. Unified Firebase Support for Mobile
When operating in Cloud-Native Mode (`AUTH_PROVIDER="firebase"`), migrating to mobile introduces zero backend friction. The native iOS/Android Firebase SDKs will authenticate users directly against Google OAuth endpoints. The generated `IdToken` will then be transmitted to our API gateway via raw request bodies to establish the same verified session context.

---

### 🏁 Summary of Architectural Alignment
By adopting a **Stateless Token Pipeline** rather than traditional server-bound cookie sessions, the platform eliminates infrastructure lock-in. This delivers a unified, production-ready backend capable of powering responsive desktop layouts and native mobile viewports under a single, shared security blueprint.



