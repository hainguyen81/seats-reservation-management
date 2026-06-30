// =========================================================================
// 🚀 DYNAMIC INFRASTRUCTURE GENERATOR FOR LIFECYCLE INITIALIZATION
// =========================================================================
/**
 * Dynamically computes and compiles the k6 execution profile options matrix
 * directly from the environment RAM variables inside the active execution process thread [3.2].
 * @returns {object} Pristine, fully-mapped k6 core configuration options block [3.2].
 */
export function generateDynamicK6TestOptions() {
  const TARGET_URL = (__ENV.TARGET_URL || "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");
  const TEST_DATA = __ENV.TEST_DATA;
  const MAX_VUS = __ENV.CONCURRENT_USERS
    ? parseInt(__ENV.CONCURRENT_USERS)
    : 50;
  const DURATION = __ENV.TEST_DURATION ? parseInt(__ENV.TEST_DURATION) : 30; // in seconds
  const GRACEFUL_STOP = __ENV.GRACEFUL_STOP
    ? parseInt(__ENV.GRACEFUL_STOP)
    : 15; // in seconds

  const rawResponseInMs = __ENV.K6_ACCEPTED_RESPONSE_IN_MS
    ? parseInt(__ENV.K6_ACCEPTED_RESPONSE_IN_MS)
    : 3000;
  const K6_ACCEPTED_RESPONSE_IN_MS =
    rawResponseInMs <= 0 ? 3000 : rawResponseInMs;

  const rawFailedPercentage = __ENV.K6_ACCEPTED_FAILED_REQ_PERCENTAGE
    ? parseInt(__ENV.K6_ACCEPTED_FAILED_REQ_PERCENTAGE)
    : 1;
  const K6_ACCEPTED_FAILED_REQ_PERCENTAGE =
    rawFailedPercentage > 100
      ? 100
      : rawFailedPercentage <= 0
      ? 0
      : rawFailedPercentage;

  // 🛡️ QUALITY GATES & METRIC THRESHOLDS (FAIL-FAST POLICY)
  const FAIL_FAST_POLICY = {};

  // Gài động điều kiện gác cổng lỗi nếu cấu hình phần trăm lớn hơn 0 [3.2]
  if (K6_ACCEPTED_FAILED_REQ_PERCENTAGE >= 0) {
    FAIL_FAST_POLICY["http_req_failed"] = [
      `rate<=${K6_ACCEPTED_FAILED_REQ_PERCENTAGE / 100}`,
    ];
  } else {
    FAIL_FAST_POLICY["http_req_failed"] = ["rate<=0.01"]; // Mặc định 1%
  }

  // Gài động điều kiện độ trễ p95 sử dụng toán tử nhỏ hơn hoặc bằng (<=) chuẩn chỉ của bạn [3.2]
  if (K6_ACCEPTED_RESPONSE_IN_MS > 0) {
    FAIL_FAST_POLICY["http_req_duration"] = [
      `p(95)<=${K6_ACCEPTED_RESPONSE_IN_MS}`,
    ];
  }

  // k6 test config
  return {
    baseUrl: TARGET_URL,
    data: TEST_DATA,

    // 🤖 Test bots
    vus: MAX_VUS,

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
}

// Re-usable helper function to inject default JSON headers
export function getBaseParams(token = null) {
  const headers = {
    "Content-Type": "application/json",
    // 🔥 simulate user agent: avoid Bot/CORS filter of Next.js Middleware
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return { headers };
}

// =========================================================================
// 🧪 UNIVERSAL ANY-TYPE DEBUG SUBSTRATE ENGINE
// =========================================================================
/**
 * Utility tracker to pretty-print any data structures (Objects, Arrays, Primitives)
 * @param {string} label - The tracking header context name
 * @param {any} targetPayload - Universal input variable boundary matrix
 */
export function debugUniversalValue(label, targetPayload) {
  console.log(
    `=========================================================================`
  );
  console.log(`🛠️ [DEBUG MATRIX] ${label.toUpperCase()}:`);
  console.log(
    `=========================================================================`
  );
  if (targetPayload === null || targetPayload === undefined) {
    console.log(`Value: ${targetPayload}`);
  } else if (typeof targetPayload === "object") {
    console.log(JSON.stringify(targetPayload, null, 2));
  } else {
    console.log(`Type: [${typeof targetPayload}] -> Value: ${targetPayload}`);
  }
  console.log(
    `=========================================================================`
  );
}
