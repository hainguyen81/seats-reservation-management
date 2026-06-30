import http from "k6/http";
import { check, sleep } from "k6";
import { k6TestOptions } from "./scalability-k6-test.js";

// =========================================================================
// 🏹 HIGH CONCURRENCY ATTACK PAYLOAD LOOP
// =========================================================================
export default function () {
  // Target the lightweight web-app health sensoring api route
  const url = `${k6TestOptions.baseUrl}/api/health`;

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
