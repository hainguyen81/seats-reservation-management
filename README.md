# Public Seat Reservation Platform

## Technical Decisions & Architecture (Senior Alignment)
- **Concurrency Control**: DB level transactional isolation to completely eliminate double-booking at the exact same millisecond.
- **Session Duration**: Mandated 90-day expiry using HTTP-Only JWT tokens for security.
- **Resiliency & Fault Tolerance**: Includes a 5-minute timeout window pattern on pending seats to gracefully release deadlocks if users abandon the payment popup screen.

## Local Setup Instructions
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
