import http from "k6/http";
import { check } from "k6";
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
  const loginChecker = `[ 🤖 ${testUser} ] Step 1 - Login Status is 200/201`;
  const tokenChecker = `[ 🤖 ${testUser} ] Step 1 - Token Received`;
  const loginPassed = check(loginRes, {
    [loginChecker]: (r) => {
      const isOk = [200, 201].includes(r.status);
      if (!isOk) {
        console.log(
          `[ 🤖 ${testUser} ${r.status} ] Login Response: ${
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
    console.error(`❌ ${testUser} logged in FAILED!`);
    return;
  }
}
