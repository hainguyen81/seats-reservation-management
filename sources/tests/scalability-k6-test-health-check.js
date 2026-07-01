import http from "k6/http";
import { check, sleep } from "k6";
import {
  generateDynamicK6TestOptions,
  debugUniversalValue,
  httpChecker,
  httpStatusChecker,
} from "./scalability-k6-test.js";

// k6 test options
export const options = generateDynamicK6TestOptions();

// =========================================================================
// 🧪 LIFECYCLE HOOK: DEBUG CẤU HÌNH ĐÃ NUỐT BIẾN __ENV THÀNH CÔNG VÂN VỨC [3.2]
// =========================================================================
export function setup() {
  // Thử ném nguyên cái options động vừa compile ra ngoài màn hình Console để rà soát
  debugUniversalValue("Compiled Real-time K6 Options Struct", options);
  
  // Trích xuất thử biến URL động từ __ENV xem có thông mạng không [3.2]
  debugUniversalValue("Target Deployed URL Endpoint", options.baseUrl);

  return { debugPipelineTerminated: false };
}

// =========================================================================
// 🏹 HIGH CONCURRENCY ATTACK PAYLOAD LOOP
// =========================================================================
export default function () {
  // Target the lightweight web-app health sensoring api route
  const url = `${options?.baseUrl || "http://localhost:3000"}/api/health`;

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
  const responseDurationChecker = `packet integrity network response time < ${options?.thresholdsConditions?.acceptedRespInMs}ms`;
  const responseStatusChecker = "http transmission status is 200";;
  check(response, {
    ...httpStatusChecker(responseStatusChecker, 200),
    ...httpChecker(
      responseDurationChecker,
      (r) =>
        (options?.thresholdsConditions?.acceptedRespInMs || 0) <= 0 ||
        r.timings.duration <=
          (options?.thresholdsConditions?.acceptedRespInMs || 0)
    ),
  });

  // ⏳ Controlled Throttling Buffer:
  // Pacing half a second between virtual user iterations to mimic realistic user behavior
  sleep(0.5);
}
