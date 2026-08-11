# Admin Analytics Design

Audience: **Platform Administrator** (Role = Admin). Cross-tenant by design
(`[Authorize(Roles="Admin")]`). Admin never accesses raw per-business PII beyond what's
needed for operations.

## Platform overview (P0)

`GET /v1/admin/dashboard` (already implemented — extends it) and
`GET /v1/admin/analytics/overview?period=30d` (NEW).

| Metric | Source | Existing? |
|---|---|---|
| Total businesses | `COUNT(Business)` | ✅ |
| Active businesses | `COUNT(business WHERE lastStamp ∈ period)` | new |
| New businesses (period) | `Business.CreatedAt` | ✅ (today/7d) |
| Churned businesses | `COUNT(Business WHERE deleted/soft-deleted ∈ period)` | PARTIAL — no soft delete |
| Total customers | `COUNT(User WHERE Role=Customer)` | ✅ |
| Total staff | `COUNT(User WHERE Role=Staff)` | ✅ |
| Total visits (stamps) | `COUNT(Stamp)` | ✅ |
| Total rewards earned | `COUNT(Redemption)` | ✅ |
| Total reward payout (KES) | `SUM(Redemption.RewardValue)` | new |
| Platform DAU | distinct customers w/ a stamp per day | new |
| Platform MAU | distinct customers w/ a stamp per month | new |
| Growth vs previous period | period-over-period | new |

## Business performance & segmentation (P1)

`GET /v1/admin/analytics/businesses?sort=growth|revenue|engagement&limit=50`

Each business normalized so large and small are comparable:

| Normalized metric | Formula | Source |
|---|---|---|
| Visit intensity | `stamps / active customers` | Stamp→Card |
| Reward payout per active customer | `SUM(Redemption) / active customers` | Redemption |
| Engagement depth | `avg stamps per active card` | Stamp→Card |
| Redemption rate | `redemptions / (stamps/StampsRequired)` | Redemption, Stamp |
| Growth velocity | `(thisMonth − lastMonth)/lastMonth` | multiple |
| Program health | completion rate vs platform avg | LoyaltyCard+Program |

**Identified cohorts:**
- **Fast-growing** — top quartile by new-customers growth
- **Declining** — negative stamp trend over 30d
- **High-engagement** — above-median stamps/customer
- **At-risk of churn** — no stamps in last 30d AND low reward payout
- **Low engagement** — below-median visits/active customer

## Platform health (P2)

| Area | Signal | Source | Priority |
|---|---|---|---|
| API usage / endpoint traffic | request counts | **NOT AVAILABLE** — needs telemetry table | P2 |
| Error rates | 5xx % of responses | **NOT AVAILABLE** — Serilog only | P2 |
| Auth failures | `UserAuth.FailedLoginAttempts`, lockouts | UserAuth | P2 |
| Payment / payout failures | Redemption status=failed | Redemption (⚠️ never set live) | P1 |
| Integration failures | — | **NOT AVAILABLE** (no 3rd-party integration logs) | P2 |
| Background job health | CleanupService runs | ILogger (ephemeral) | P3 |
| Notification failures | email send exceptions | ILogger (ephemeral) | P3 |

> **Telemetry gap:** There is no `ApiRequestLog` / `EventLogEntry` table. Error & usage
> telemetry currently lives only in Serilog logs. To produce platform-health analytics
> (M76/M77, and the admin "feature usage / drop-off" questions in §13), a lightweight
> event log is required (see `data-requirements.md`).

## Platform-level insight engine (P1, extends existing /insights)

Already ships 6 hardcoded insights (`AdminService.GetInsightsAsync`). Replace/extend with
a parametrized engine that the admin can filter by period and category. See
`insight-engine.md`.

## Security & isolation

- Admin endpoints are inherently cross-tenant; **admin must never expose customer PII
  (phone, DOB) unless operationally required** — current `AdminCustomerSummary` exposes
  `PhoneNumber`, `Gender`; consider redacting for export.
- Admin "Delete user" refuses to delete Admin role (already enforced).
- No admin endpoint currently exports raw PII in bulk — keep it that way; provide
  aggregated-only views for sensitive dimensions.

## Response shape (proposed admin overview)

```jsonc
{
  "period": "30d",
  "platform": {
    "activeBusinesses": 1240,
    "platformDau": 8920,
    "platformMau": 41230,
    "totalRewardPayoutKes": 2150000,
    "businessGrowthPct": 12.4
  },
  "segments": {
    "fastGrowing": [...],
    "declining": [...],
    "highEngagement": [...],
    "atRisk": [...]
  }
}
```
