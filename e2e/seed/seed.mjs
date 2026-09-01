/**
 * Deterministic E2E tenant seeder (Phase 5 acceptance).
 * Creates (idempotently): a business owner, a business, an active loyalty
 * program, a customer, and a fresh customer QR token — then writes the
 * tenant state to e2e/.auth/tenant.json for the specs to consume.
 *
 * Run standalone:  node seed/seed.mjs
 * Env:
 *   E2E_API_URL   default http://localhost:8080/v1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.E2E_API_URL ?? "http://localhost:8080/v1";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".auth", "tenant.json");

const OWNER = {
  fullName: "E2E Owner",
  email: process.env.E2E_OWNER_EMAIL ?? "e2e-owner@punched.test",
  password: process.env.E2E_PASSWORD ?? "E2ePassword!234",
  businessName: "E2E Salon",
  businessCategory: "salon",
};
const CUSTOMER = {
  fullName: "E2E Customer",
  email: process.env.E2E_CUSTOMER_EMAIL ?? "e2e-customer@punched.test",
  password: process.env.E2E_PASSWORD ?? "E2ePassword!234",
};

async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function registerOrLogin(user, role) {
  let res = await post("/auth/register", { ...user, role });
  if (res.status === 400 && /exist/i.test(JSON.stringify(res.json))) {
    // Already registered from a previous run — fall through to login.
  } else if (res.status >= 400) {
    console.warn(`[seed] register ${user.email} -> ${res.status}: ${JSON.stringify(res.json)}`);
  }
  res = await post("/auth/login", { email: user.email, password: user.password });
  if (res.status >= 400 || !res.json?.data?.accessToken) {
    throw new Error(
      `[seed] login failed for ${user.email} (${res.status}): ${JSON.stringify(res.json)}. ` +
        `If email verification is enforced in this environment, seed through a ` +
        `verified tenant or relax verification for the E2E profile.`,
    );
  }
  return res.json.data;
}

export default async function seed() {
  const owner = await registerOrLogin(OWNER, "Business");
  const customer = await registerOrLogin(CUSTOMER, "Customer");

  // Owner's business (scope resolved from the JWT).
  const businessRes = await fetch(`${API}/businesses/me`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
  });
  const business = (await businessRes.json().catch(() => ({})))?.data;
  if (!business?.id) throw new Error("[seed] could not resolve owner's business — is register-business required for this tenant?");

  // Active program (idempotent creation attempt; read back on conflict).
  let programRes = await post("/programs/me", {
    name: "E2E Program",
    stampsRequired: 5,
    rewardValue: 500,
    rewardDescription: "Free Coffee",
  }, owner.accessToken);
  if (programRes.status >= 400) {
    console.warn(`[seed] program create -> ${programRes.status}: ${JSON.stringify(programRes.json)} (may already exist)`);
  }

  // Enroll the E2E customer at the owner's business (idempotent). The golden-path
  // specs assume the seeded customer already has an active loyalty card so the
  // customer dashboard renders the card (X/5 progress) and /stamps/award can
  // issue stamps against it without hitting the NOT_ENROLLED branch.
  const enrollRes = await post("/cards/enroll", { businessId: business.id }, customer.accessToken);
  if (enrollRes.status !== 201 && enrollRes.status !== 409) {
    throw new Error(`[seed] customer enroll failed (${enrollRes.status}): ${JSON.stringify(enrollRes.json)}`);
  }

  // Fresh QR token for the customer (each seed run rotates the token).
  const qrRes = await post("/qr/generate", { businessId: business.id }, customer.accessToken);
  if (qrRes.status >= 400 || !qrRes.json?.data?.token) {
    throw new Error(`[seed] QR generate failed (${qrRes.status}): ${JSON.stringify(qrRes.json)}`);
  }

  const tenant = {
    api: API,
    owner: { email: OWNER.email, password: OWNER.password, token: owner.accessToken },
    customer: { email: CUSTOMER.email, password: CUSTOMER.password, token: customer.accessToken },
    businessId: business.id,
    qrToken: qrRes.json.data.token,
    qrExpiresAt: qrRes.json.data.expiresAt,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(tenant, null, 2));
  console.log(`[seed] E2E tenant written to ${OUT}`);
  return tenant;
}

// Allow running directly (`node seed/seed.mjs`) as well as via globalSetup.
if (process.argv[1] && process.argv[1].endsWith("seed.mjs")) {
  seed().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
