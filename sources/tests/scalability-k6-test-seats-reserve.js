import http from "k6/http";
import { check, sleep } from "k6";
import { getBaseParams } from "./scalability-k6-test.js";

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
  const baseUrl = options?.baseUrl || "http://localhost:3000";
  const params = getBaseParams();
  const TARGET_SEATS = (options?.data || "").split(",").map((s) => s.trim());

  const testUser = `k6-bot-user-${__VU}@seats-reservation.com`;
  const loginPayload = JSON.stringify({
    email: testUser,
    password: `k6-bot-user-${__VU}@123`,
  });

  // Execute authentic user credentials evaluation flow
  const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, params);
  const loginChecker = `[ 🤖 ${testUser} ] Step 1 - Login Status is 200`;
  const loginPassed = check(loginRes, {
    [loginChecker]: (r) => r.status === 200,
  });

  if (!loginPassed) {
    console.error(`❌ ${testUser} logged in FAILED!`);
    return;
  }

  // Inject token dynamically using our helper utility mapping
  const authParams = getBaseParams(loginRes.json("accessToken"));
  sleep(1);

  // Synchronized aggressive memory-lock placement blast
  const holdPayload = JSON.stringify({ seats: TARGET_SEATS });

  const holdRes = http.post(
    `${baseUrl}/api/reserve/hold`,
    holdPayload,
    authParams
  );
  const isWinnerOfHold = holdRes.status === 200 || holdRes.status === 201;

  const holdChecker = `[ 🤖 ${testUser} ] Step 2 - Hold Concurrency Handled (200/201/400 or 409)`;
  check(holdRes, {
    [holdChecker]: (r) => [200, 201, 400, 409].includes(r.status),
  });

  if (!isWinnerOfHold) return; // Evict losers gracefully to prevent database inflation

  // Final payment transaction closure processing
  const paymentPayload = JSON.stringify({
    seats: TARGET_SEATS,
    mockPaymentSuccess: true,
  });

  const paymentRes = http.post(
    `${baseUrl}/api/reserve`,
    paymentPayload,
    authParams
  );
  const paymentChecker = `[ 🤖 ${testUser} ] Step 3 - Final Payment Successful (HTTP 200)`;
  check(paymentRes, {
    [paymentChecker]: (r) => r.status === 200,
  });
}
