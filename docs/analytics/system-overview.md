# System Overview — Data & Domain Model

## 1. Platform summary

Punched is a digital customer-loyalty / rewards SaaS platform. A **Business** runs one
or more **LoyaltyPrograms**; customers earn **Stamps** (one per visit, via QR scan) and
redeem rewards valued in KES. A **ReferralProgram** drives viral growth. Staff members
(employees of a business) are credited for the stamps they award.

> Punched does **not** contain appointments, a service catalog, invoices, a payment
> ledger, reviews, inventory, or persistent notifications. See `seed-scaffold-proposals.md`
> for proposed future scaffolding. The "visits" concept is fully represented by
> **Stamp** records.

## 2. Core entities (source-of-truth)

Every entity inherits `BaseEntity` (`Id` Guid PK, `CreatedAt` DateTime.UtcNow).

### User (`users`)
The single user table for **all** roles (Customer, Business, Staff, Admin).

| Field | Type | Notes / Analytics relevance |
|---|---|---|
| `Id` | Guid PK | identity anchor |
| `Email` | string, unique | FK↔`user_auth.email`; customer/business analytics |
| `PhoneNumber` | string? | contact analytics |
| `FullName` | string | display / staff attribution |
| `AvatarUrl` | string? | profile analytics |
| `DateOfBirth` | DateOnly? | age demographics |
| `Gender` | string? | demographic analytics |
| `Role` | UserRole enum | routing & analytics scope |
| `StaffBusinessId` | Guid? FK→businesses | staff→business linking |
| `CreatedAt` | DateTime | registration/acquisition analytics |

**Navigation:** `Auth` (1:1 UserAuth), `LoyaltyCards` (as customer), `Redemptions` (as redeemer — no FK column on User).

> ⚠️ The `User.Redemptions` navigation exists in code but there is **no FK column** —
> redemptions join to `User` only indirectly via `LoyaltyCard.CustomerId`.

### UserAuth (`user_auth`)
Credentials & verification state (1:1 with User via `Email`).

| Field | Type | Analytics relevance |
|---|---|---|
| `Email` | string, unique | identity |
| `PasswordHash` | string | auth only (never analytics) |
| `IsVerified` | bool | email-activation funnel |
| `FailedLoginAttempts` | short | security / lockout analytics |
| `LockedUntil` | DateTime? | security analytics |
| `LastLoginAt` | DateTime? | active-user / login analytics |
| `VerificationCode*`, `VerificationCodeAttempts` | string/short | 2FA funnel |
| `CreatedAt` | DateTime | account-creation analytics |

### RefreshToken (`refresh_tokens`)
JWT refresh token store. `Token` unique, `ExpiresAt`, `IsRevoked`, `RevokedAt`.
Analytics relevance: session/token revocation counts, churn signal.

### Business (`businesses`)
A merchant location run by a business-owner user.

| Field | Type | Analytics relevance |
|---|---|---|
| `Name` | string | business performance |
| `Category` | string | segment/category analytics |
| `Location` | string | geography analytics |
| `PhoneNumber`, `Email` | string? | contact / outreach |
| `Description`, `LogoUrl` | string? | completeness |
| `MpesaNumber` | string | payout destination |
| `OwnerId` | Guid? FK→users | business ownership |
| `CreatedAt` | DateTime | business growth |

**Navigation:** `Owner`, `LoyaltyPrograms`, `ReferralProgram` (1:1), `LoyaltyCards`, `Stamps`, `Redemptions`.

### LoyaltyProgram (`loyalty_programs`)
The rewards configuration for a business (N per business).

| Field | Type | Analytics relevance |
|---|---|---|
| `BusinessId` | Guid FK | tenant scope |
| `Name` | string | program identity |
| `IsActive` | bool | active vs archived |
| `StampsRequired` | int | reward cadence / threshold |
| `RewardValue` | decimal(10,2) | **KES reward cost per redemption** |
| `RewardDescription` | string | reward identity |
| `RewardExpirationHours` | int (default 48) | expiry config |
| `CreatedAt` | DateTime | program adoption |

### LoyaltyCard (`loyalty_cards`)
A customer's enrollment at a business. **Unique: (CustomerId, BusinessId)** — one card
per customer per business.

| Field | Type | Analytics relevance |
|---|---|---|
| `CustomerId` | Guid FK→users | customer link |
| `BusinessId` | Guid FK→businesses | tenant scope |
| `ProgramId` | Guid FK→loyalty_programs | program snapshot |
| `TotalStamps` | int (0–100) | **current cycle stamps (resets on redemption)** |
| `LifetimeStamps` | int (0–999) | **cumulative stamps (never resets)** |
| `TotalRedemptions` | int (0–99) | completed reward cycles |
| `LastStampAt` | DateTime? | last visit / recency / churn |
| `EnrolledAt` | DateTime | enrollment / retention |
| `RewardExpiresAt` | DateTime? | unclaimed reward expiry |
| `CreatedAt` | DateTime | card creation |

Check: `lifetime_stamps >= total_stamps` (enforced at DB).

### Stamp (`stamps`)  — **immutable audit log of every visit**
> One stamp row = one customer visit (QR scan) = one transaction.

| Field | Type | Analytics relevance |
|---|---|---|
| `CardId` | Guid FK→loyalty_cards | visit owner |
| `StampNumber` | short | sequential visit number per card |
| `StampedAt` | DateTime | **visit timestamp** (the core time dimension) |
| `QrTokenId` | Guid (unique) | source-of-truth token (one stamp/token) |
| `AwardedByUserId` | Guid? FK→users | **staff attribution** (nullable — see Gaps) |
| `CreatedAt` | DateTime | creation |

Indexes: `(card_id, stamped_at)`, `(awarded_by_user_id, stamped_at)`.
**No soft-delete / update — immutable.**

### QrToken (`qr_tokens`)
Short-lived rotating QR for stamp verification. `TokenHash` (SHA256, unique), `ExpiresAt`,
`IsUsed`. Raw token is client-side only.

### Redemption (`redemptions`)
A reward payout record. Status flow: `pending → processing → completed | failed`.

| Field | Type | Analytics relevance |
|---|---|---|
| `CardId` | Guid FK | redemption owner |
| `BusinessId` | Guid FK | tenant scope |
| `RewardValue` | decimal(10,2) | **KES reward payout value (cost to business)** |
| `Status` | string (default "pending") | payout status |
| `MpesaRef` | string? | M-Pesa transaction reference |
| `RedeemedAt` | DateTime | reward earned timestamp |
| `PaidAt` | DateTime? | **actual payout confirmation (nullable)** |
| `CreatedAt` | DateTime | record creation |

Indexes: `status`, `(card_id, redeemed_at)`, `(business_id, redeemed_at)`.

> ⚠️ **Critical anomaly:** `StampService.AwardStampAsync` and `RedemptionService.ClaimRewardAsync`
> both create a `Redemption` with `Status = "completed"` **immediately**, leaving
> `PaidAt = null` and `MpesaRef = null`. There is no real M-Pesa payout processing. The
> seed data sets `PaidAt`, but live traffic does not. `Status` is effectively binary
> (earned vs. not-earned), **not** a true payout pipeline. This is a major gap (see
> `data-gaps.md`).

### ReferralProgram (`referral_programs`)
One per business (unique BusinessId). `ReferralsRequired`, `RewardType` (Stamp/Discount/
FreeItem), `RewardValue`, `RewardDescription`, `IsActive`, `ExpirationDays`.

### ReferralLink (`referral_links`)
A customer-generated referral URL/code. `Code` (unique 12-char), `ReferrerId`,
`BusinessId`, `SuccessfulReferrals` (counter). **Unique: (ReferrerId, BusinessId).**

### Referral (`referrals`)
One per referee-business (filtered unique excluding Expired). State machine:
`Pending → Activated → Qualified → Rewarded` (or `Expired`).
Timestamps: `ActivatedAt`, `QualifiedAt`, `RewardedAt`, `ExpiresAt`.

> Referral is **qualified on the referee's first stamp** (`StampService` calls
> `ReferralService.ProcessFirstStampReferralAsync`). The referrer's reward fires when
> `ReferralsRequired` referrals are qualified.

## 3. Business workflows

### W1 — User registration & verification
`POST /v1/auth/register` → email verification code → `POST /v1/auth/verify-email` → JWT issued.
**Analytics angle:** account-creation funnel, verification rate, time-to-verify.

### W2 — Business onboarding
Business-role user → `POST /v1/businesses` (sets `OwnerId`) →
`POST /v1/programs/me` (creates `LoyaltyProgram` with `StampsRequired`, `RewardValue`).
**Analytics angle:** business setup completion, program configuration.

### W3 — Staff onboarding
Staff-role user → owner links via `POST /v1/businesses/me/staff/{id}` →
`User.StaffBusinessId` set.
**Analytics angle:** staff coverage, linkage rate.

### W4 — Customer enrollment
Customer → `POST /v1/cards/enroll` (businessId) → `LoyaltyCard` created (unique per customer+
business). **Analytics angle:** acquisition funnel, enrollment timing.

### W5 — Stamp awarding (the core "visit")
1. Customer `POST /v1/qr/generate` → `QrToken` (45s TTL, hash stored).
2. Staff/Business `POST /v1/stamps/award` → hash verified → `QrToken.IsUsed=true` →
   `LoyaltyCard.TotalStamps++` / `LifetimeStamps++` / `LastStampAt=now` →
   if threshold: `TotalStamps=0`, `TotalRedemptions++`, auto-create `Redemption`
   (Status=completed) → `Stamp` row created (AwardedByUserId set) → SSE push + email.
3. First stamp triggers referral qualification hook.
**Analytics angle:** visit frequency, hourly/daily peak, staff attribution.

### W6 — Reward redemption
At threshold: auto-created (W5). OR customer `POST /v1/redemptions/claim` →
`Redemption` created, `TotalStamps=0`, `TotalRedemptions++`.
**Analytics angle:** redemption rate, reward cost (KES), payout status.

### W7 — Referral lifecycle
Customer `POST /v1/referrals/links` → `ReferralLink`. Referee `POST /v1/referrals/resolve`
→ `Referral` (Pending/Activated). Referee's first stamp → Qualified. Threshold → Rewarded.
**Analytics angle:** viral coefficient, conversion funnel, reward cost of referrals.

### W8 — Authentication lifecycle
Login / `verify-email` → `UserAuth.LastLoginAt` set. Refresh-token rotation. Logout revokes.
**Analytics angle:** DAU, session length, churn signal.

## 4. Tenant / role model

| Role | Scope | Key auth mechanism |
|---|---|---|
| Customer | Own cards/redemptions only | `userId` claim → User.Id; card ownership verified per-request |
| Business | Own `Business` (via `OwnerId`) | `userId` claim → User.Id → `Business.OwnerId` |
| Staff | Single linked `Business` (via `StaffBusinessId`) | `userId` claim → User.Id → `StaffBusinessId` |
| Admin | Cross-tenant (all data) | `[Authorize(Roles="Admin")]` on controller |

- User ID is passed as the `userId` claim (User.Id, **not** UserAuth.Id).
- Business is resolved inside every service via `OwnerId == userId` (never trusted from client).
- **No multi-location concept** — one business per business-owner user.

## 5. Time dimensions available

All timestamps are **UTC**. Daily buckets are reliable. No per-record timezone or
locale. `Created stamp` fields exist on every entity, giving a reliable audit timeline.

| Time field | Entity | Granularity | Reliability |
|---|---|---|---|
| `CreatedAt` | all 12 entities | second | High (auto) |
| `StampedAt` | Stamp | second | High (visit proxy) |
| `RedeemedAt` | Redemption | second | High (reward proxy) |
| `LastStampAt` | LoyaltyCard | second | High (recency) |
| `EnrolledAt` | LoyaltyCard | second | High (acquisition) |
| `LastLoginAt` | UserAuth | second | High (activity) |
| `PaidAt` | Redemption | second | **Low** (nullable, unset in live flow) |
| `*At` referral fields | Referral | second | High |
| `ExpiresAt` | QrToken/RefreshToken/Referral | second | High (lifecycle) |

## 6. Existing analytics surface (what's already shipped)

The API already implements analytics. See the controller/service matrix below. The
specification in this directory **extends and completes** these, not replaces them.

### Already implemented endpoints
```
# Admin (v1/admin) — cross-tenant
GET /dashboard                 → AdminDashboardResponse
GET /growth?period=30d         → AdminGrowthResponse (7d/30d/90d)
GET /analytics/businesses      → category breakdown + top/recent businesses
GET /analytics/customers       → gender/age + engagement + top customers
GET /analytics/staff           → staff stamp leaderboard
GET /insights                  → 6 hardcoded smart insights
GET /users, /users/{id}        → user management
GET /businesses, /businesses/{id}
GET /redemptions

# Business (v1/businesses)
GET /me                        → business profile
GET /me/dashboard              → BusinessDashboardResponse
GET /me/analytics?period       → BusinessAnalyticsResponse (hourly, heatmap, demographics,
                                  engagement trends, program perf, growth, retention,
                                  staff perf, funnel, top customers)
GET /me/customers, /me/customers/{id}, /me/customers/export (CSV)
GET /me/staff, /me/staff/{id}/analytics?period
GET /me/customers/{id}/stats?period

# Staff (v1/businesses)
GET /staff/my-business
GET /staff/analytics           → StaffAnalyticsResponse

# Customer
GET /v1/cards                  → own cards
POST /v1/cards/enroll
GET /v1/redemptions           → own redemption history
GET /v1/referrals/stats, /links, /incoming, /resolve
GET /v1/sse/cards/{cardId}    → real-time stamp events
GET /v1/users/profile

# Auth
POST /v1/auth/register, /login, /verify-email, /refresh-token, /logout
```

### Notable existing analytics design strengths
- Output-caching policies: `analytics` (30s, vary-by period), `dashboard` (10s).
- Business analytics pre-aggregates per-period and batches queries (avoids N+1 inside
  the period scope) — though cross-entity subqueries in projections remain N+1 risks
  (see `performance.md`).
- Staff attribution via `Stamp.AwardedByUserId` (added migration `20260422_AddStampAttribution`).
- Staff analytics **scoped to the linked business** + `AwardedByUserId` filter.

### Notable gaps in existing analytics
- No **comparisons** (period-over-period, day/week/month).
- No **monetary value** analytics (reward cost, payout value).
- Admin insights are **6 hardcoded rules** — no generic, parametrized engine.
- No **real-time** vs daily classification; no forecasting/prediction.
- Redemption `Status`/`PaidAt` anomaly is silently ignored.
- No customer **segmentation model** beyond ad-hoc engagement buckets.
