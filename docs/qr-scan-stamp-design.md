# QR-Scan Stamp Issuance — Design

> Status: **DESIGN ONLY** — implementation deferred to the next session.
> This document captures the agreed approach; no controller/service code has
> been written yet.

## Goal

Provide a dedicated, idempotent endpoint that issues a single `Stamp` of
source `Scan` when a staff member or business owner scans a customer's QR code,
beyond the existing in-SSE token-award flow. This gives the frontend a
first-class REST path for scan issuance with clear idempotency semantics and
analytics integration.

## Endpoint

```
POST /v1/stamps/scan
Authorization: Bearer <business-or-staff-token>
Content-Type: application/json
```

### Request body

```json
{
  "qrTokenId": "uuid-of-the-qr-token",
  "userId": "uuid-of-the-customer-being-stamped",
  "staffUserId": "uuid-of-the-staff-member-who-scanned"
}
```

| Field        | Type   | Required | Notes |
|--------------|--------|----------|-------|
| `qrTokenId`  | Guid   | yes      | FK to the `QrToken`. Existing `Stamp.QrTokenId` FK already added to the schema. |
| `userId`     | Guid   | yes      | The customer whose loyalty card receives the stamp. |
| `staffUserId`| Guid   | optional | The staff member who performed the scan (may be the business owner). |

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid-of-new-stamp",
    "cardId": "uuid-of-loyalty-card",
    "customerId": "uuid-of-customer",
    "stampNumber": 4,
    "stampedAt": "2026-08-13T09:00:00Z",
    "source": "scan",
    "rewardReady": false
  },
  "error": null
}
```

## Semantics

1. **Resolve the business** from `qrTokenId.BusinessId`. The acting user must be
   the business owner or a staff member linked to that business (security guard).
2. **Idempotency**: if a `Stamp` already exists with this `QrTokenId`, return the
   existing stamp (HTTP 200) instead of creating a duplicate. The unique index on
   `Stamp.QrTokenId` (already present in the schema, nullable for system stamps)
   is the DB-level backstop.
3. **Loyalty card lookup**: find the `LoyaltyCard` for `(userId, qrToken.BusinessId)`
   — mirroring the existing `AwardStampAsync` logic. If missing, return `NOT_ENROLLED`.
4. **Create the stamp** with `Source = "scan"` and `AwardedByUserId = staffUserId`.
5. **Increment `StaffDailyAnalytics`** for the staff member (`Stamps` +1,
   `DistinctCustomers` as applicable) for the current `Date`.
6. Return the new `Stamp`.

## Validation / Errors

- `qrTokenId` unknown → `INVALID_TOKEN` (404 / 400).
- QR already used → idempotent success (existing stamp) or `TOKEN_USED` per
  product decision, **not** a `DbUpdateException` leak.
- Acting user not authorized for `qrToken.BusinessId` → `FORBIDDEN_SCOPE` (403).
- Customer not enrolled → `NOT_ENROLLED` (404).

## Schema Notes

- `Stamp.QrTokenId` FK already added — no schema migration required for the QR
  link itself.
- `Stamp.Source` column already present (`"scan"` / `"enrollment"`).
- `StaffDailyAnalytics` table (`staff_daily_analytics`) already exists — the
  endpoint must keep it in sync via the existing `IAnalyticsAggregationService`
  recompute helpers.

## Out of Scope (this design pass)

- Real-time SSE push to the customer (can be layered on later reusing
  `ISseService`).
- Reward auto-redemption (the existing `AwardStampAsync` handles the
  threshold/reset logic; this endpoint focuses on idempotent single-stamp
  issuance).
