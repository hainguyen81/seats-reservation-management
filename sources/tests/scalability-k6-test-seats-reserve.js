import http from "k6/http";
import { check, sleep } from "k6";
import { k6TestOptions, getBaseParams } from "./scalability-k6-test";

// =========================================================================
// 📈 INJECTING DYNAMIC LIFECYCLE CONFIGURATIONS VIA GITHUB ACTIONS env
// =========================================================================
const SEATS_RESERVATION = __ENV.SEATS_RESERVATION || "A5,A6";

// =========================================================================
// 🏹 HIGH CONCURRENCY ATTACK PAYLOAD LOOP
// =========================================================================
export default function () {
  const baseUrl = k6TestOptions.baseUrl;
  const params = getBaseParams();
  const TARGET_SEATS = (SEATS_RESERVATION || "")
    .split(",")
    .map((s) => s.trim());

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
