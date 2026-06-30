import http from "k6/http";
import { check, sleep } from "k6";
import {
  generateDynamicK6TestOptions,
  getBaseParams,
  debugUniversalValue,
} from "./scalability-k6-test.js";

// k6 test options
export const options = generateDynamicK6TestOptions();

// =========================================================================
// 🧪 LIFECYCLE HOOK: DEBUG CẤU HÌNH ĐÃ NUỐT BIẾN __ENV THÀNH CÔNG VÂN VỨC [3.2]
// =========================================================================
export function setup() {
  // debug test config
  debugUniversalValue("Compiled K6 Real-time Options Struct", options);

  // debug target URL from __ENV
  debugUniversalValue("Target Deployed URL Endpoint", options.baseUrl);

  return { debugPipelineTerminated: false };
}

// =========================================================================
// 🏹 HIGH CONCURRENCY ATTACK PAYLOAD LOOP
// =========================================================================
export default function () {
  const baseUrl = options?.baseUrl || "http://localhost:3000";
  const params = getBaseParams();
  const TARGET_SEATS = (options?.data || "A5,A6")
    .split(",")
    .map((s) => s.trim());

  const username = `k6-bot-user-${__VU}@seats-reservation.com`;
  const password = `k6-bot-user-${__VU}@123`;
  const loginPayload = JSON.stringify({ username, password });

  // Execute authentic user credentials evaluation flow
  const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, params);
  const loginChecker = `[ 🤖 ${username} ] Step 1 - Login Status is 200/201`;
  const tokenChecker = `[ 🤖 ${username} ] Step 1 - Token Received`;
  const loginPassed = check(loginRes, {
    [loginChecker]: (r) => {
      const isOk = [200, 201].includes(r.status);
      if (!isOk) {
        console.log(
          `[ 🤖 ${username} ${r.status} ] AUTH Response: ${
            r?.body || "Response No Data"
          }`
        );
      }
      return isOk;
    },
    [tokenChecker]: (r) => {
      const cookiesReceived = r.cookies;
      return (
        (cookiesReceived["seat-access-token"] || "").length ||
        (cookiesReceived["seat-firebase-session"] || "").length
      );
    },
  });

  if (!loginPassed) {
    console.error(`❌ ${username} logged in FAILED!`);
    return;
  }

  // Inject token dynamically using our helper utility mapping
  sleep(1);

  // Synchronized aggressive memory-lock placement blast
  const holdPayload = JSON.stringify({ seats: TARGET_SEATS });

  const holdRes = http.post(
    `${baseUrl}/api/reserve/hold`,
    holdPayload,
    params
  );
  const isWinnerOfHold = holdRes.status === 200 || holdRes.status === 201;

  const holdChecker = `[ 🤖 ${username} ] Step 2 - Hold Concurrency Handled (200/201/400 or 409)`;
  check(holdRes, {
    [holdChecker]: (r) => {
      const isOk = [200, 201, 400, 409].includes(r.status);
      if (!isOk) {
        console.log(
          `[ 🤖 ${username} ${r.status} ] HOLD Response: ${
            r?.body || "Response No Data"
          }`
        );
      }
      return isOk;
    },
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
    params
  );
  const paymentChecker = `🏆 [ 🤖 ${username} ] Step 3 - Final Payment Successful (HTTP 200)`;
  check(paymentRes, {
    [paymentChecker]: (r) => {
      const isOk = r.status === 200;
      if (!isOk) {
        console.log(
          `[ 🤖 ${username} ${r.status} ] PAYMENT Response: ${
            r?.body || "Response No Data"
          }`
        );
      }
      return isOk;
    },
  });
}
