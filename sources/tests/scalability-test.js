import http from "k6/http";
import { check, sleep } from "k6";

// 🚀 Load profile configuration: Simulates a sudden spike traffic scenario for seat reservation
export const options = {
  stages: [
    { duration: "10s", target: 50 }, // Ramp-up: Scale from 0 to 50 concurrent virtual users within 10 seconds
    { duration: "20s", target: 200 }, // Spike phase: Instantly maintain 200 users hammering the endpoint simultaneously
    { duration: "10s", target: 0 }, // Ramp-down: Cool down phase, gracefully scaling down to 0 users
  ],
  thresholds: {
    // Quality Gate: 95% of requests must complete the database roundtrip and respond under 300ms
    http_req_duration: ["p(95)<300"],
    // System tolerance: Infrastructure crash rate (HTTP 5xx errors) must be strictly lower than 1%
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Target API endpoint (Dynamically injected via GitHub Actions workflow environment variables)
  const BASE_URL = __ENV.TARGET_URL || "http://localhost:3000";

  // Randomly select seat IDs from seat-1 to seat-10 to deliberately force a high-concurrency race condition
  const randomSeatId = `seat-${Math.floor(Math.random() * 10) + 1}`;

  const payload = JSON.stringify({
    seatId: randomSeatId,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Simulation-Agent": "k6-scalability-runner",
    },
  };

  // Execute the atomic high-frequency transaction request to the Next.js App Router API boundary
  const response = http.post(`${BASE_URL}/api/reserve/hold`, payload, params);

  // Concurrency integrity evaluation matrix
  check(response, {
    // HTTP 200: Seat successfully held/reserved
    // HTTP 409: Conflict securely intercepted by Prisma Optimistic Locking version constraints (Expected behavior!)
    "Safe Concurrency Caught (Status 200 or 409)": (r) =>
      r.status === 200 || r.status === 409,
    // Verifies that the underlying microservice infrastructure did not throw unhandled exceptions or crash
    "App did not crash (Status is not 500)": (r) => r.status !== 500,
  });

  // Paces the user interaction loop: Every virtual user waits 100ms before triggering the next seat selection query
  sleep(0.1);
}
