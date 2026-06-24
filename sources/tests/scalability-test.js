import http from "k6/http";
import { check, sleep } from "k6";

// =========================================================================
// 📈 INJECTING DYNAMIC LIFECYCLE CONFIGURATIONS VIA GITHUB ACTIONS env
// =========================================================================
const TARGET_URL = __ENV.TARGET_URL || "http://localhost:3000";
const MAX_VUS = parseInt(__ENV.CONCURRENT_USERS) || 50;
const DURATION = __ENV.TEST_DURATION || 30; // in seconds

export const options = {
  // 🎢 TESTING FLOW PROFILE: Ramping profiles optimized for GKE micro-nodes
  stages: [
    { duration: "10s", target: MAX_VUS }, // 1. Fast ramp-up from zero to peak stress VUs
    { duration: `${DURATION}s`, target: MAX_VUS }, // 2. Sustained peak load endurance window
    { duration: "10s", target: 0 }, // 3. Smooth cool-down back to safe zero zone
  ],

  // 🛡️ QUALITY GATES & METRIC THRESHOLDS (FAIL-FAST POLICY)
  thresholds: {
    // ❌ Error Rate Boundary: If more than 1% of total API calls return 5xx/4xx, fail the pipeline immediately [3.2]
    http_req_failed: ["rate<0.01"],
    // ⏱️ Latency Tolerances: 95% of requests must respond under 1.5 seconds to maintain transaction integrity
    http_req_duration: ["p(95)<1500"],
  },
};

// =========================================================================
// 🏹 HIGH CONCURRENCY ATTACK PAYLOAD LOOP
// =========================================================================
export default function () {
  // Target the lightweight web-app health sensoring api route
  const url = `${TARGET_URL}/api/health`;

  // Configure execution parameter metrics
  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-App-Benchmark-Client": "k6-load-injector-engine",
    },
  };

  // Dispatch atomic concurrent execution call
  const response = http.get(url, params);

  // Validate transactional status response maps
  check(response, {
    "http transmission status is 200": (r) => r.status === 200,
    "packet integrity network response time < 500ms": (r) =>
      r.timings.duration < 500,
  });

  // ⏳ Controlled Throttling Buffer:
  // Pacing half a second between virtual user iterations to mimic realistic user behavior
  sleep(0.5);
}
