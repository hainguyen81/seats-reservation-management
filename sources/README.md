# Public Seat Reservation Platform

---

## Project Source Code Structure
```
├── prisma/
│   └── schema.prisma					# SQLite schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts		# API Login (90 days)
│   │   │   ├── seats/route.ts        	# API to get the seats list
│   │   │   └── reserve/route.ts      	# API to reserve seat and payment (Transaction)
│   │   │   └── release/route.ts      	# API to release seat if expired/cancelled
│   │   ├── layout.tsx
│   │   └── page.tsx                  	# Main UI (Dashboard)
│   └── lib/
│       ├── db.ts           			# Initial Prisma Client
│       └── auth.ts         			# Hash/Encode JWT
├── .env
├── README.md
└── package.json
```

---

## Integrate Firebase Provider for Authentication

### Client-Side Firebase API Key Security Disclosure

The client-side `apiKey` utilized within the Firebase Client configuration differs fundamentally from conventional API keys, which are typically used to restrict backend resources. Instead, it functions purely as a public **Project Identifier** that enables the frontend application to route requests to the designated Google infrastructure.

Data confidentiality and operational integrity (including read/write loops and state mutations within the seat reservation matrix) are strictly enforced via standard defensive layers:
1. **Server-Side Session Verification**: Authenticated through `firebase-admin` via secure, HTTP-Only session cookies.
2. **Database Integrity**: Protected by server-managed ACID transactions that eliminate concurrent race conditions.

Consequently, exposing the `apiKey` within the client-side bundle complies with Google’s architectural specifications and introduces zero vulnerability to the core security posture of the platform.

---
