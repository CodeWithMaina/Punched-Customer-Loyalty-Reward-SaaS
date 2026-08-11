# Customer Analytics Design

Audience: **Customer** (Role = Customer). A customer may belong to multiple businesses;
each card is scoped to one business. Customers see only their own data.

## Self-analytics dashboard (P0)

```
GET /v1/customers/me/cards          → list of cards (existing GET /cards)
GET /v1/customers/me/card/{id}      → single card with analytics
GET /v1/customers/me/vitals?businessId={id}
```

### Per-card widgets (P0)

| Widget | Metric | Source | Existing? |
|---|---|---|---|
| Stamps to next reward | `Program.StampsRequired − Card.TotalStamps` | LoyaltyCard+Program | ✅ via Enroll response, extend to dashboard |
| Lifetime stamps | `Card.LifetimeStamps` | LoyaltyCard | ✅ |
| Total rewards earned | `Card.TotalRedemptions` | LoyaltyCard | ✅ |
| Last visit | `Card.LastStampAt` | LoyaltyCard | ✅ |
| Days since last visit | `now − LastStampAt` | LoyaltyCard | new |
| Enrolled date | `Card.EnrolledAt` | LoyaltyCard | ✅ |
| Next expected visit | last + cadence ± slack | Stamp sequence | P3 (predictive) |

### Visit history (P1)

A customer should see their own visit timeline:

```
GET /v1/customers/me/cards/{id}/visits?period=90d&page=1&size=25
```
Returns `Stamp.StampedAt` (and `StampNumber`), ordered DESC. This powers:
- "You've visited 12 times in the last 90 days."
- "Your average gap between visits: 14 days."
- Cadence-based "next expected visit" (P3).

> ⚠️ **Data availability:** Stamps exist for every visit (M06), so this is fully AVAILABLE.
> Only limitation: `Stamp.AwardedByUserId` may be null for older records — staff who
> served the customer on each visit may be unattributed in history.

### Visit cadence & prediction (P1/P3)

| Metric | Formula | Priority |
|---|---|---|
| Avg days between visits | `AVG(StampedAt − LAG(StampedAt)) per card` | P1 |
| Visit regularity score | stddev of inter-visit gap (low = regular) | P2 |
| Next expected visit | `LastStampAt + avg cadence` with ±20% band | P3 |
| Churn risk (self) | `days since last visit > cadence*2` | P2 |
| Milestone progress | "2 more stamps = free reward" | P0 |

## Customer segmentation (customer-facing)

The customer app should show the customer their own segment so messaging is relevant:

| Segment | Rule | Visible metric |
|---|---|---|
| New | `EnrolledAt within 30d` | "Keep going — you're building momentum" |
| Active | `LastStampAt within 30d` | "You're on fire!" |
| At-risk | `LastStampAt 30–60d` | "We miss you — come back soon" |
| Dormant | `LastStampAt > 60d` | "Your card awaits — here's how many stamps you had" |

## Referral (customer) analytics

Already existing: `GET /v1/referrals/stats` returns `ReferralStatsResponse`.

| Widget | Metric | Source |
|---|---|---|
| Referral code + link | ReferralLink.Code | ✅ |
| Successful referrals | ReferralLink.SuccessfulReferrals | ✅ |
| My referral funnel | count by Referral.Status | ✅ (GetMyReferrals) |
| Referral reward earned | count Status=Rewarded | ✅ |
| Value of referrals earned (KES) | `COUNT(Rewarded) * Program.RewardValue` | new |

## Engagement notifications (P1)

Push/email the customer when analytics thresholds are met — driven by the insight engine
(customer-scoped insights):

> "You have 3 stamps left until your next free reward!" (M78)
> "It's been 18 days — your next visit is overdue." (cadence)
> "Your referral Jane qualified — you're 1 away from your next bonus!"
> "Claim your reward before it expires in 2 days." (RewardExpiresAt, M40)

## Security / privacy

- Customer endpoints are pre-filtered to `CustomerId` from the JWT `userId` claim.
- A customer may ONLY view cards, redemptions, and stamps belonging to them.
- SSE on `/v1/sse/cards/{cardId}` verifies `card.CustomerId == caller` (already enforced).
- Customer must NEVER see other customers' data, staff analytics, or business totals.
- Do not expose `UserAuth` fields (FailedLoginAttempts, PasswordHash) to customer views.
