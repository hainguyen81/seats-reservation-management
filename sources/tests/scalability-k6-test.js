import http from "k6/http";
import { check, sleep } from "k6";

// =========================================================================
// 📈 INJECTING DYNAMIC LIFECYCLE CONFIGURATIONS VIA GITHUB ACTIONS env
// =========================================================================
const TARGET_URL = __ENV.TARGET_URL || "http://localhost:3000";
const MAX_VUS = parseInt(__ENV.CONCURRENT_USERS) || 50;
const DURATION = parseInt(__ENV.TEST_DURATION) || 30; // in seconds
const GRACEFUL_STOP = parseInt(__ENV.GRACEFUL_STOP) || 15; // in seconds
const K6_ACCEPTED_RESPONSE_IN_MS =
  parseInt(__ENV.K6_ACCEPTED_RESPONSE_IN_MS) || 3000 <= 0
    ? 0
    : parseInt(__ENV.K6_ACCEPTED_RESPONSE_IN_MS) || 3000; // in miliseconds (3 seconds)
const K6_ACCEPTED_FAILED_REQ_PERCENTAGE =
  parseInt(__ENV.K6_ACCEPTED_FAILED_REQ_PERCENTAGE) || 1 > 100
    ? 100
    : parseInt(__ENV.K6_ACCEPTED_FAILED_REQ_PERCENTAGE) || 1 <= 0
    ? 0
    : parseInt(__ENV.K6_ACCEPTED_FAILED_REQ_PERCENTAGE) || 1; // in percentage (1%)

// 🛡️ QUALITY GATES & METRIC THRESHOLDS (FAIL-FAST POLICY)
const FAIL_FAST_POLICY =
    K6_ACCEPTED_RESPONSE_IN_MS > 0
      ? K6_ACCEPTED_FAILED_REQ_PERCENTAGE >= 0
        ? {
            // ❌ Error Rate Boundary: If more than 1% of total API calls return 5xx/4xx, fail the pipeline immediately [3.2]
            http_req_failed: [
              `rate<=${K6_ACCEPTED_FAILED_REQ_PERCENTAGE / 100}`,
            ],
            // ⏱️ Latency Tolerances: 95% of requests must respond under 1.5 seconds to maintain transaction integrity
            http_req_duration: [`p(95)<=${K6_ACCPTED_RESPONSE_IN_MS}`],
          }
        : {
            // ⏱️ Latency Tolerances: 95% of requests must respond under 1.5 seconds to maintain transaction integrity
            http_req_duration: [`p(95)<=${K6_ACCPTED_RESPONSE_IN_MS}`],
          }
      : K6_ACCEPTED_FAILED_REQ_PERCENTAGE >= 0
      ? {
          // ❌ Error Rate Boundary: If more than 1% of total API calls return 5xx/4xx, fail the pipeline immediately [3.2]
          http_req_failed: [`rate<=${K6_ACCEPTED_FAILED_REQ_PERCENTAGE / 100}`],
        }
      : {
          // ❌ Error Rate Boundary: If more than 1% of total API calls return 5xx/4xx, fail the pipeline immediately [3.2]
          http_req_failed: [`rate<=0.01`],
        };

export const options = {
  // 🛡️ QUALITY GATES & METRIC THRESHOLDS (FAIL-FAST POLICY)
  thresholds: FAIL_FAST_POLICY,
  
  // =========================================================================
  // 🔥 SYNC BLOCK: FORCE K6 SEND METRICS TO NATIVE OPENTELEMETRY GATEWAY
  // =========================================================================
  ext: {
    loadimpact: {
      project: 0,
      name: "GKE Seats Reservation Benchmarking",
    },
  },

  // =========================================================================
  // 🎬 Scenarios: FORCE K6 SEND METRICS TO NATIVE OPENTELEMETRY GATEWAY
  // =========================================================================
  scenarios: {
    contacts: {
      executor: "ramping-vus",
      startVUs: 0,
      // 🎢 TESTING FLOW PROFILE: Ramping profiles optimized for GKE micro-nodes
      stages: [
        { duration: "10s", target: MAX_VUS }, // 1. Fast ramp-up from zero to peak stress VUs
        { duration: `${DURATION}s`, target: MAX_VUS }, // 2. Sustained peak load endurance window
        { duration: "10s", target: 0 }, // 3. Smooth cool-down back to safe zero zone
      ],
      // 🎯 keep k6 wait a minute before finishing test. wait for pushing metrics finished
      gracefulStop: `${GRACEFUL_STOP}s`,
    },
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
