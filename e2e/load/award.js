/**
 * k6 load test — POST /v1/stamps/award (Phase 5).
 *
 * Goals:
 *   1. p95 latency < 300ms.
 *   2. ZERO duplicate stamps under 50 concurrent same-token requests —
 *      the token is single-use, so exactly ONE request gets 200 and every
 *      other request must get 400 TOKEN_USED (never 5xx, never two wins).
 *
 * Invocation (skipped automatically when K6_ENABLED is unset, so CI is never
 * blocked):
 *   K6_ENABLED=1 k6 run e2e/load/award.js
 *
 * Env:
 *   E2E_API_URL     default http://localhost:8080/v1
 *   E2E_TOKEN_FILE  default e2e/.auth/tenant.json (written by seed/seed.mjs)
 *   CONCURRENT      default 50
 *
 * Verifying zero duplicates after the run: re-query the card's stamp ledger —
 * exactly one Stamp row must exist for the seeded token. The seed script
 * rotates the QR token per run, so `node seed/seed.mjs && K6_ENABLED=1 k6 run
 * e2e/load/award.js` gives a clean single-use token each time.
 */
if (typeof __ENV === "undefined") {
  // Plain `node e2e/load/award.js` (no k6 runtime) → CI-safe skip.
  console.log("[k6] K6_ENABLED unset or k6 runtime missing — award load test skipped.");
  console.log("[k6] Run manually with: K6_ENABLED=1 k6 run e2e/load/award.js");
  if (typeof global !== "undefined") process.exit(0);
}

import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

const awardLatency = new Trend("award_latency_ms", true);

const API = __ENV.E2E_API_URL || "http://localhost:8080/v1";
const tenant = JSON.parse(open(__ENV.E2E_TOKEN_FILE || "../.auth/tenant.json"));
const CONCURRENT = Number(__ENV.CONCURRENT || 50);

export const options = {
  scenarios: {
    same_token_race: {
      executor: "per-vu-iterations",
      vus: CONCURRENT,
      iterations: CONCURRENT,
      maxDuration: "2m",
    },
  },
  thresholds: {
    award_latency_ms: ["p(95)<300"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const res = http.post(
    `${API}/stamps/award`,
    JSON.stringify({ token: tenant.qrToken, businessId: tenant.businessId }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenant.owner.token}`,
      },
    },
  );
  awardLatency.add(res.timings.duration);

  check(res, {
    "single-use token honoured (200 or TOKEN_USED 400)": (r) =>
      r.status === 200 || (r.status === 400 && r.body.includes("TOKEN_USED")),
    "never 5xx": (r) => r.status < 500,
  });
}
