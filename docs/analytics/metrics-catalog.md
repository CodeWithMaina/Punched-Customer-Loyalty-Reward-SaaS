# Metrics Catalog

Every metric the analytics system should expose, traced to actual source fields.
Priorities: **P0** (core product), **P1** (high value), **P2** (enhancement),
**P3** (advanced/predictive).

## Conventions
- **Visit** = a `Stamp` row. Each stamp is one customer visit (QR scan).
- **Reward cycle** = reaching `StampsRequired` and earning a `Redemption`.
- **Tenant scope** = always keyed on `BusinessId` for staff/owner queries.
- All monetary values are **KES** (Kenya Shillings), decimal(10,2).
- Time bucket keys use `DATE_TRUNC`-style logic; the API should offer `interval = day|week|month|quarter|year`.

---

## A. Volume / engagement (P0)

| # | Metric | Formula | Data source | Entities | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|---|
| M01 | Total customers | `COUNT(User WHERE Role=Customer)` | User | User | Role, Id | Real-time | AVAILABLE | P0 |
| M02 | New customers (period) | `COUNT(User WHERE Role=Customer AND CreatedAt ∈ [start,end))` | User | User | CreatedAt | Daily | AVAILABLE | P0 |
| M03 | Total businesses | `COUNT(Business)` | Business | Business | Id | Real-time | AVAILABLE | P0 |
| M04 | New businesses (period) | `COUNT(Business WHERE CreatedAt ∈ period)` | Business | Business | CreatedAt | Daily | AVAILABLE | P0 |
| M05 | Total staff | `COUNT(User WHERE Role=Staff)` | User | User | Role | Real-time | AVAILABLE | P0 |
| M06 | Stamps awarded (visits) | `COUNT(Stamp) [scoped]` | Stamp | Stamp | StampedAt, AwardedByUserId, CardId | Near-real-time | AVAILABLE | P0 |
| M07 | Stamps (period) | count with date filter | Stamp | Stamp | StampedAt | Daily | AVAILABLE | P0 |
| M08 | Total loyalty cards (enrollments) | `COUNT(LoyaltyCard) [scoped]` | LoyaltyCard | LoyaltyCard | BusinessId | Daily | AVAILABLE | P0 |
| M09 | New enrollments (period) | count by EnrolledAt | LoyaltyCard | LoyaltyCard | EnrolledAt | Daily | AVAILABLE | P0 |
| M10 | Total redemptions (rewards earned) | `COUNT(Redemption) [scoped]` | Redemption | Redemption | RedeemedAt, BusinessId | Daily | AVAILABLE | P0 |
| M11 | Redemptions (period) | count by RedeemedAt | Redemption | Redemption | RedeemedAt | Daily | AVAILABLE | P0 |
| M12 | Total referrals | `COUNT(Referral) [scoped]` | Referral | Referral | BusinessId | Daily | AVAILABLE | P0 |
| M13 | Active programs | `COUNT(LoyaltyProgram WHERE IsActive)` | LoyaltyProgram | LoyaltyProgram | IsActive, BusinessId | Daily | AVAILABLE | P0 |

## B. Growth & trend analytics (P0/P1)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M14 | Customer growth trend | `COUNT(User, grouped by day) WHERE role=Customer` | User | CreatedAt | Daily | DERIVABLE | P1 |
| M15 | Business growth trend | `COUNT(Business, grouped by day)` | Business | CreatedAt | Daily | DERIVABLE | P1 |
| M16 | Stamps trend (visits/day) | `COUNT(Stamp) GROUP BY day` | Stamp | StampedAt | Daily | AVAILABLE | P0 |
| M17 | Redemptions trend | `COUNT(Redemption) GROUP BY day` | Redemption | RedeemedAt | Daily | AVAILABLE | P1 |
| M18 | Period-over-period growth | `(periodN - periodN-1) / periodN-1 * 100` | any metric | relevant date | Daily | DERIVABLE | P1 |
| M19 | Customer cohort retention | `COUNT(cohort month X retained in month Y)` | User + Stamp | CreatedAt, StampedAt | Daily | DERIVABLE | P2 |
| M20 | Active days (visits streak) | consecutive days with ≥1 stamp | Stamp | StampedAt, CardId | Daily | DERIVABLE | P2 |

## C. Engagement value & reward-cost ("revenue") (P0/P1)

> The only monetary field is `Redemption.RewardValue` (KES). This is **reward payout cost**,
> not customer-revenue. True LTV/revenue needs customer spend (see `data-gaps.md`).

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M21 | Total reward payout (KES) | `SUM(Redemption.RewardValue)` | Redemption | RewardValue, BusinessId | Daily | DERIVABLE | P1 |
| M22 | Reward payout (period, KES) | `SUM(RewardValue WHERE RedeemedAt ∈ period)` | Redemption | RewardValue, RedeemedAt | Daily | DERIVABLE | P1 |
| M23 | Reward payout by program (KES) | `SUM(Redemption.RewardValue) GROUP BY ProgramId` | Redemption→Card→Program | RewardValue, ProgramId | Daily | DERIVABLE | P1 |
| M24 | Average reward value | `AVG(Redemption.RewardValue)` | Redemption | RewardValue | Daily | DERIVABLE | P2 |
| M25 | Reward payout trend (KES/day) | `SUM(RewardValue) GROUP BY day` | Redemption | RewardValue, RedeemedAt | Daily | DERIVABLE | P1 |
| M26 | Accrued stamp liability (KES) | `SUM(LoyaltyCard.TotalStamps) * (Program.RewardValue / StampsRequired)` | LoyaltyCard→Program | TotalStamps, RewardValue, StampsRequired | Daily | DERIVABLE | P1 |
| M27 | Unredeemed reward liability | cards with `RewardExpiresAt > now` | LoyaltyCard | TotalStamps, RewardExpiresAt | Daily | PARTIALLY AVAILABLE | P2 |
| M28 | Outstanding (unpaid) rewards | `COUNT(Redemption WHERE PaidAt IS NULL)` | Redemption | PaidAt | Daily | PARTIALLY AVAILABLE (live PaidAt is null) | P1 |

## D. Visit-pattern analytics (P1)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M29 | Stamps by hour-of-day | `COUNT(Stamp) GROUP BY EXTRACT(HOUR FROM StampedAt)` | Stamp | StampedAt | Daily | AVAILABLE | P1 |
| M30 | Stamps by day-of-week | `COUNT(Stamp) GROUP BY EXTRACT(DOW FROM StampedAt)` | Stamp | StampedAt | Daily | AVAILABLE | P1 |
| M31 | Peak hours | top N hours by stamp count | Stamp | StampedAt | Daily | DERIVABLE | P1 |
| M32 | Underutilized hours | bottom N hours by stamp count | Stamp | StampedAt | Daily | DERIVABLE | P1 |
| M33 | Weekly activity heatmap (day×hour) | 7×24 matrix of stamp counts | Stamp | StampedAt | Daily | AVAILABLE | P1 |
| M34 | Average visits per customer | `total stamps / total customers` | Stamp, LoyaltyCard | count | Daily | DERIVABLE | P2 |
| M35 | Visit cadence (avg days between visits) | `AVG(StampedAt - LAG(StampedAt))` per card | Stamp | StampedAt, CardId | Daily | DERIVABLE | P2 |
| M36 | Repeat-customer rate | `COUNT(cards with ≥2 stamps) / COUNT(all cards)` | LoyaltyCard | LifetimeStamps | Daily | DERIVABLE | P1 |

## E. Loyalty funnel (P0)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M37 | Funnel: enrolled → stamped-once → completed → redeemed | `COUNT(LoyaltyCard); COUNT(card with LifetimeStamps>0); COUNT(card with LifetimeStamps>=StampsRequired); COUNT(card with TotalRedemptions>0)` | LoyaltyCard | LifetimeStamps, TotalRedemptions, StampsRequired | Daily | AVAILABLE | P0 |
| M38 | Card completion rate | `cards completed / cards enrolled` | LoyaltyCard | LifetimeStamps, Program.StampsRequired | Daily | DERIVABLE | P0 |
| M39 | Time-to-complete a card | `MIN(Redemption.RedeemedAt) - LoyaltyCard.EnrolledAt` | Redemption→Card | RedeemedAt, EnrolledAt | Daily | DERIVABLE | P1 |
| M40 | Reward expiry risk | `COUNT(cards WHERE RewardExpiresAt < now AND TotalStamps>0)` | LoyaltyCard | RewardExpiresAt, TotalStamps | Daily | PARTIALLY AVAILABLE (no auto-expiry job) | P1 |
| M41 | Program completion rate | `COUNT(cards LifetimeStamps>=StampsRequired) / COUNT(cards)` per program | LoyaltyCard→Program | LifetimeStamps, StampsRequired | Daily | DERIVABLE | P1 |

## F. Customer segmentation & retention (P0/P1)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M42 | Returning customers | `cards with TotalRedemptions>0 OR LifetimeStamps>1` | LoyaltyCard | TotalRedemptions, LifetimeStamps | Daily | AVAILABLE | P0 |
| M43 | Retention rate | `(new + returning) / total active` (existing in `RetentionSummary`) | LoyaltyCard | LastStampAt, EnrolledAt | Daily | AVAILABLE | P0 |
| M44 | Dormant customers | `cards where LastStampAt < now-30d` | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P0 |
| M45 | At-risk customers | `cards where LastStampAt ∈ [now-30d, now-7d]` | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M46 | New customers (30d) | `cards where EnrolledAt >= now-30d` | LoyaltyCard | EnrolledAt | Daily | AVAILABLE | P0 |
| M47 | Customer segment: New | enrolled within retention window | LoyaltyCard | EnrolledAt | Daily | AVAILABLE | P1 |
| M48 | Customer segment: Loyal | `LifetimeStamps >= avg*2` | LoyaltyCard | LifetimeStamps | Daily | DERIVABLE | P2 |
| M49 | Customer segment: High-value | top 10% by LifetimeStamps | LoyaltyCard | LifetimeStamps | Daily | DERIVABLE | P2 |
| M50 | Customer segment: Frequent | visits/week >= threshold | Stamp | StampedAt | Daily | DERIVABLE | P2 |
| M51 | Customer segment: Inactive | LastStampAt < now - 60d | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M52 | Customer segment: At-risk | LastStampAt ∈ [30,60]d | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M53 | Customer segment: Churned | LastStampAt < now - 90d | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M54 | Last visit | `LoyaltyCard.LastStampAt` | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M55 | Customer demographics | gender / age buckets | User | Gender, DateOfBirth | Daily | AVAILABLE | P1 |

## G. Staff analytics (P0/P1/P2)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M56 | Stamps issued (staff) | `COUNT(Stamp WHERE AwardedByUserId=?) [scoped]` | Stamp | AwardedByUserId | Daily | AVAILABLE | P0 |
| M57 | Stamps period (staff) | date-filtered count | Stamp | AwardedByUserId, StampedAt | Daily | AVAILABLE | P0 |
| M58 | Customers served (staff) | `COUNT(DISTINCT Card.CustomerId WHERE stamp.AwardedByUserId=?)` | Stamp→Card | AwardedByUserId, CustomerId | Daily | AVAILABLE | P0 |
| M59 | Reward-ready customers created (staff) | cards stamped by staff reaching threshold | Stamp→Card | AwardedByUserId, TotalStamps | Daily | PARTIALLY AVAILABLE | P1 |
| M60 | Staff productivity trend | stamps/day per staff | Stamp | AwardedByUserId, StampedAt | Daily | DERIVABLE | P1 |
| M61 | Staff utilization % | — | — | — | — | NOT AVAILABLE (no shifts) | FUTURE |
| M62 | Revenue per staff | — | — | — | — | NOT AVAILABLE | FUTURE |
| M63 | Customer satisfaction (rating) | — | — | — | — | NOT AVAILABLE (no reviews) | FUTURE |

## H. Referral analytics (P1)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M64 | Total referrals sent | `COUNT(Referral WHERE ReferrerId=?)` | Referral | ReferrerId | Daily | AVAILABLE | P1 |
| M65 | Referral funnel | counts by status (Pending/Activated/Qualified/Rewarded/Expired) | Referral | Status, timestamps | Daily | AVAILABLE | P1 |
| M66 | Referral conversion rate | `Rewarded / Sent` | Referral | Status | Daily | DERIVABLE | P1 |
| M67 | Viral coefficient | `Rewarded referrals / Active referrers` | Referral | ReferrerId, Status | Daily | DERIVABLE | P2 |
| M68 | Referral reward cost (KES) | `SUM(ReferralProgram.RewardValue)` for rewarded | Referral+Program | RewardValue | Daily | AVAILABLE | P1 |
| M69 | Referral expiration rate | `COUNT(Expired) / COUNT(all)` | Referral | ExpiresAt, Status | Daily | AVAILABLE | P2 |
| M70 | Referee → high-value analysis | referrer's redemptions/stamps vs non-referral customers | Referral+Stamp | RefereeId | Daily | DERIVABLE | P2 |

## I. Platform / Admin analytics (P1)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M71 | Platform DAU | distinct customers/stamps per day | Stamp | StampedAt | Daily | AVAILABLE | P1 |
| M72 | Platform MAU | distinct customers/stamps per month | Stamp/User | StampedAt/CreatedAt | Daily | AVAILABLE | P1 |
| M73 | Business churn | businesses deleted | Business (needs soft-delete) | — | Daily | PARTIALLY AVAILABLE | P1 |
| M74 | Active businesses | businesses with ≥1 stamp in window | Stamp→Card→Business | StampedAt | Daily | AVAILABLE | P1 |
| M75 | Business comparison (normalized) | stamps/staff, cards/staff | Stamp, LoyaltyCard, User | AwardedByUserId | Daily | DERIVABLE | P2 |
| M76 | API error rate | 5xx / total requests | **needs telemetry** | — | Near-real-time | NOT AVAILABLE | P2 |
| M77 | Auth failure rate | failed logins / attempts | UserAuth | FailedLoginAttempts | Daily | AVAILABLE | P2 |

## J. Customer-facing self-analytics (P1)

| # | Metric | Formula | Data source | Fields | Refresh | Availability | Priority |
|---|---|---|---|---|---|---|---|
| M78 | Customer's stamps to next reward | `LoyaltyCard.TotalStamps` vs `Program.StampsRequired` | LoyaltyCard→Program | TotalStamps, StampsRequired | Near-real-time | AVAILABLE | P0 |
| M79 | Lifetime stamps | `LoyaltyCard.LifetimeStamps` | LoyaltyCard | LifetimeStamps | Daily | AVAILABLE | P0 |
| M80 | Total rewards earned | `LoyaltyCard.TotalRedemptions` | LoyaltyCard | TotalRedemptions | Daily | AVAILABLE | P0 |
| M81 | Last visit | `LoyaltyCard.LastStampAt` | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M82 | Days since last visit | `now - LastStampAt` | LoyaltyCard | LastStampAt | Daily | AVAILABLE | P1 |
| M83 | My referral link stats | ReferralLink.SuccessfulReferrals | ReferralLink | SuccessfulReferrals | Daily | AVAILABLE | P1 |

---

## Priority rollup

| Priority | Count | Examples |
|---|---|---|
| P0 — Critical | ~18 | Active customers, stamps, redemptions, enrollment, funnel, dormant |
| P1 — High | ~40 | Trends, reward cost, peak hours, retention, referrals, cohort |
| P2 — Medium | ~15 | LTV proxy, staff productivity, viral coeff., age/gender, active businesses |
| P3 — Future | ~8 | Revenue/LTV, staff utilization, reviews/satisfaction, API errors, forecasting |

## Permission matrix

| Metric | Business Owner | Staff | Admin | Customer |
|---|---|---|---|---|
| Own-business stamps/revenue | ✅ own | ✅ own | ✅ all | ❌ |
| Staff stamps (own) | ✅ within business | ✅ own only | ✅ all | ❌ |
| Own activity / self | ✅ n/a | ✅ own | ✅ all | ✅ own |
| Platform totals | ❌ | ❌ | ✅ | ❌ |
| Cross-business comparison | ❌ | ❌ | ✅ | ❌ |
