import http from "k6/http";
import { sleep } from "k6";
import { getBaseParams } from "./scalability-k6-test";

// =========================================================================
// 🏹 HIGH CONCURRENCY ATTACK PAYLOAD LOOP
// =========================================================================
export function registerBots(opts) {
  console.log(
    "========================================================================="
  );
  console.log(
    "🧱 [PHASE 1] STARTING AUTOMATED BOT PRE-PROVISIONING INSIDE SETUP HOOK"
  );
  console.log(
    "========================================================================="
  );

  const baseUrl = opts?.baseUrl || "http://localhost:3000";
  const vus = opts?.vus || 0;
  // =========================================================================
  // 🛡️ GATEWAY CHEKER: Invalid number of bots
  // =========================================================================
  if (vus === undefined || vus === null || isNaN(vus) || vus <= 0) {
    console.error(
      `\n🚨 [VALIDATION CRITICAL ERROR] Benchmark aborted at pre-flight boundary!`
    );
    console.error(
      `👉 The calculated concurrent users variable 'CONCURRENT_USERS' is completely invalid.`
    );
    console.error(`📊 Received Value: [ ${vus} ]`);
    console.error(
      `💡 Solution: Ensure 'CONCURRENT_USERS' env is correctly injected via GitHub CI/CD.\n`
    );

    // 🔥 FAILURE: break pipline
    throw new Error(
      `Aborting stress test loop due to non-viable Virtual Users bounds: ${vus}`
    );
  }
  console.log(
    `📡 Preparing to create exactly ${vus} unique high-security bot accounts...`
  );

  const params = getBaseParams();

  // 🏁 Sequential loop to register bots:
  // - Loop to avoid CPU down by Bcrypt
  for (let i = 1; i <= vus; i++) {
    const username = `k6-bot-user-${i}@seats-reservation.com`;
    const password = `k6-bot-user-${i}@123`;
    const registerPayload = JSON.stringify({ username, password });

    // login if not found bot will be created automatically
    const res = http.post(`${baseUrl}/api/auth/login`, registerPayload, params);
    // Validate transactional status response maps
    const responseStatusChecker = "Require status 200";
    check(res, {
      ...httpStatusChecker(
        responseStatusChecker,
        [200, 201],
        (r) =>
          console.log(
            `✅ [ ${username} Provisioning] Successfully materialized data for Bot User [${i}/${vus}]`
          ),
        (r) =>
          console.log(
            `🚨 [ ${username} Critical Provisioning Error] Bot User [${i}] failed with status: ${res.status}`
          )
      ),
    });

    // wait 10 miliseconds before continue
    sleep(0.01);
  }

  console.log(
    "========================================================================="
  );
  console.log(
    "✨ [PHASE 1 COMPLETE] Database is populated! Moving to Phase 2 Attack Loop..."
  );
  console.log(
    "========================================================================="
  );

  // debug test config
  debugUniversalValue("Compiled K6 Real-time Options Struct", opts);

  return { isDatabasePopulated: true };
}
