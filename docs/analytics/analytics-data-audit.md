# Analytics Data Audit

Classification of every analytically-meaningful metric against the **current** backend
data. Grounded strictly in actual entities, fields, and the seed/activity flows.

| Class | Meaning |
|---|---|
| **AVAILABLE** | Sufficient data already exists; implementable now. |
| **DERIVABLE** | Data exists but requires a SQL/EF aggregation (counts, joins, date buckets). No new capture needed. |
| **PARTIALLY AVAILABLE** | Some data exists; additional capture/event required for accuracy. |
| **NOT AVAILABLE** | No data exists; requires new tables/fields. |

---

## 1. Volume & Engagement metrics

| Metric | Source entity | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Total customers | User (Role=Customer) | ✅ | AVAILABLE | `CountAsync` on users by role |
| Total businesses | Business | ✅ | AVAILABLE | `CountAsync` |
| Total staff | User (Role=Staff) | ✅ | AVAILABLE | `CountAsync` by role |
| Total stamps (visits) | Stamp | ✅ | AVAILABLE | `CountAsync` — each stamp = 1 visit |
| Total redemptions (rewards earned) | Redemption | ✅ | AVAILABLE | `CountAsync` (all statuses) |
| Total loyalty cards (enrollments) | LoyaltyCard | ✅ | AVAILABLE | `CountAsync` |
| Total referrals | Referral | ✅ | AVAILABLE | `CountAsync` |
| New customers (today / 7d / 30d) | User.CreatedAt | ✅ | AVAILABLE | Date filter on CreatedAt |
| New businesses (period) | Business.CreatedAt | ✅ | AVAILABLE | Date filter |
| New enrollments (period) | LoyaltyCard.EnrolledAt | ✅ | AVAILABLE | Date filter |
| Stamps in period | Stamp.StampedAt | ✅ | AVAILABLE | Date filter |
| Redemptions in period | Redemption.RedeemedAt | ✅ | AVAILABLE | Date filter (⚠️ PaidAt unreliable — see §5) |
| Stamps required per program | LoyaltyProgram.StampsRequired | ✅ | AVAILABLE | Direct field |
| Reward value per redemption | LoyaltyProgram.RewardValue / Redemption.RewardValue | ✅ | AVAILABLE | Snapshot exists on Redemption |
| Active programs | LoyaltyProgram.IsActive | ✅ | AVAILABLE | Boolean filter |

## 2. Revenue / Reward-Cost metrics

> "Revenue" in Punched = **reward payout cost** (KES). Customer spend is NOT tracked.

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Total reward payout (KES) | Redemption.RewardValue | ✅ | DERIVABLE | `Sum(RewardValue)` grouped by period/business |
| Reward payout today / 7d / 30d | Redemption.RedeemedAt + RewardValue | ✅ | DERIVABLE | Date-filtered sum |
| Reward payout by program | Redemption.RewardValue + ProgramId | ✅ | DERIVABLE | Join Redemption→Card→Program, group by program |
| Reward payout by staff | Redemption + Stamp.AwardedByUserId* | ⚠️ Partial | PARTIALLY AVAILABLE | Redemption has no staff FK. Stamp has AwardedByUserId, but redemption is not directly linked to the stamp that earned it. Requires linking Redemption→Card→Stamps with AwardedByUserId, which is approximate (the card may have multiple staff). |
| Average reward value | Redemption.RewardValue | ✅ | DERIVABLE | `Average` |
| Outstanding / unpaid rewards | Redemption.PaidAt IS NULL | ⚠️ Partial | PARTIALLY AVAILABLE | PaidAt is **not set in live traffic** (only seeded). Cannot reliably distinguish. Needs real payout tracking. |
| Failed payouts | Redemption.Status = "failed" | ⚠️ False negative | NOT AVAILABLE | Code never sets "failed" in practice; always "completed". Status is not a real state machine. |
| Refund / chargeback | — | ❌ | NOT AVAILABLE | No refunds table; no failed-status transitions |
| Deposits | — | ❌ | NOT AVAILABLE | No deposits concept |
| Payment method breakdown | — | ❌ | NOT AVAILABLE | No payment methods; all rewards are "free" loyalty. M-Pesa is payout destination, not collection. |
| Customer spend (LTV in KES) | — | ❌ | NOT AVAILABLE | Customer spend at the business is never recorded. LTV can only be *proxy* by stamps/redemptions. |

## 3. Visitor / Visit (Stamp) analytics

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Total visits (stamps) | Stamp.StampedAt | ✅ | AVAILABLE | Count of stamps |
| Visits today / 7d / 30d | Stamp.StampedAt | ✅ | AVAILABLE | Date filter |
| Visits by hour-of-day | Stamp.StampedAt | ✅ | DERIVABLE | `GROUP BY DATE_PART('hour', StampedAt)` |
| Visits by day-of-week | Stamp.StampedAt | ✅ | DERIVABLE | `GROUP BY DATE_PART('dow', StampedAt)` |
| Peak hours / busiest periods | Stamp.StampedAt | ✅ | DERIVABLE | Aggregation + ordering |
| Underutilized hours | Stamp.StampedAt | ✅ | DERIVABLE | Inverse of peak; compare against staff working hours ⚠️ (working-hours data NOT available — see §7) |
| Average visits per customer | Stamp + LoyaltyCard | ✅ | DERIVABLE | stamps / customers |
| Visit frequency (days between visits) | Stamp.StampedAt per card | ✅ | DERIVABLE | LAG window per card |
| Repeat visit (2nd+ stamp) | Stamp.StampNumber / card | ✅ | DERIVABLE | StampNumber > 1 OR lifetime > 1 |
| First-time visitors | LoyaltyCard.EnrolledAt vs first Stamp.StampedAt | ✅ | DERIVABLE | First stamp per card |
| Visit streak / cadence | Stamp.StampedAt sequence | ✅ | DERIVABLE | Gap analysis between consecutive stamps |
| Booking conversion | — | ❌ | NOT AVAILABLE | No booking/funnel; "enrollment → first stamp" is the closest proxy (AVAILABLE as DERIVABLE funnel) |
| Cancellation / No-show | — | ❌ | NOT AVAILABLE | No bookings exist to cancel; no-show = no stamp (infers from lack of stamps, but unreliable) |

## 4. Loyalty program / reward funnel analytics

| Metric | Source | Current data? | Verdaict | Reason |
|---|---|---|---|---|
| Enrollment → first stamp (conversion) | LoyaltyCard.EnrolledAt → Stamp | ✅ | DERIVABLE | First stamp per card vs enrollment |
| Stamps → reward (completion) | LoyaltyCard.LifetimeStamps vs StampsRequired | ✅ | AVAILABLE | `LifetimeStamps >= StampsRequired` |
| Reward earned → redeemed | Redemption.RedeemedAt | ✅ | AVAILABLE | Count of redemptions |
| Funnel: enrolled → stamped-once → completed-card → redeemed | LoyaltyCard + Stamp + Redemption | ✅ | DERIVABLE | Multi-step aggregation (already partially built in `FunnelData`) |
| Completion rate by program | LoyaltyCard.LifetimeStamps vs StampsRequired | ✅ | DERIVABLE | Per-program group |
| Time-to-complete card | LoyaltyCard.EnrolledAt → first Redemption.RedeemedAt | ✅ | DERIVABLE | Per-card duration |
| Reward expiry hit rate | LoyaltyCard.RewardExpiresAt → unredeemed | ⚠️ Partial | PARTIALLY AVAILABLE | RewardExpiresAt is set, but there's no background job to expire/revoke. Cards with RewardExpiresAt < now and still unredeemed are "expired rewards". Computable now but no automated expiry action. |
| Program adoption | LoyaltyProgram.CreatedAt, LoyaltyCard count | ✅ | AVAILABLE | Count cards per program |
| Program change impact | LoyaltyProgram updates | ⚠️ Partial | PARTIALLY AVAILABLE | Program fields are mutable (no versioning). Changing StampsRequired mid-cycle mutates the card's expected threshold. No program-version history snapshot. |

## 5. Redemption / payout pipeline analytics

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Redemptions by status | Redemption.Status | ⚠️ False | NOT AVAILABLE | All live records are "completed". The 4-state machine (pending/processing/completed/failed) never transitions. Cannot measure pipeline health. |
| Payout success rate | Redemption.PaidAt / Status | ⚠️ False | NOT AVAILABLE | PaidAt is null in live flow; Status always "completed". |
| Payout latency (redeemed → paid) | Redemption.RedeemedAt → PaidAt | ⚠️ Unreliable | PARTIALLY AVAILABLE | PaidAt only set in seed. Real payout latency unknown. |
| Pending payouts (queued) | Redemption.Status="pending" | ⚠️ False | NOT AVAILABLE | No real pending state in live data. |
| Failed payouts | Redemption.Status="failed" | ❌ | NOT AVAILABLE | Never emitted. |

## 6. Customer analytics

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| New customers (cohort) | User.CreatedAt | ✅ | AVAILABLE | Date bucketing |
| Returning customers | LoyaltyCard.TotalRedemptions > 0 OR LifetimeStamps > 1 | ✅ | DERIVABLE | Count cards with >1 stamp or >0 redemptions |
| Customer lifetime value | — | ❌ | NOT AVAILABLE | No spend tracking. Only *stamp* count as a proxy (partial). |
| Booking frequency | Stamp.StampedAt per customer | ✅ | DERIVABLE | Stamps per customer per period |
| Average stamps per customer | LoyaltyCard.LifetimeStamps | ✅ | DERIVABLE | Avg of LifetimeStamps |
| Repeat booking rate | Stamp.StampNumber / card | ✅ | DERIVABLE | Cards with ≥2 stamps |
| Cancellation behavior | — | ❌ | NOT AVAILABLE | No cancellations; missing-appointment proxy infeasible |
| Churn (customer inactivity) | LoyaltyCard.LastStampAt | ✅ | AVAILABLE | LastStampAt older than N days => inactive (Dormant). Already computed in `EngagementBreakdown` & `RetentionSummary`. |
| Dormant / inactive / at-risk | LoyaltyCard.LastStampAt | ✅ | AVAILABLE | Bucketed by days-since-last-stamp |
| Favorite staff | Stamp.AwardedByUserId per card | ⚠️ Partial | PARTIALLY AVAILABLE | Only stamps with AwardedByUserId set (post-2026-04-22 migration). Older stamps unattributed. |
| Favorite program / service | LoyaltyCard.ProgramId | ✅ | AVAILABLE | Group cards by program |
| Next expected visit | Stamp.StampedAt cadence | ⚠️ Heuristic | PARTIALLY AVAILABLE | Can model from avg gap, but no explicit "expected" field. Prediction, not fact. |
| Last visit | LoyaltyCard.LastStampAt | ✅ | AVAILABLE | Direct field |
| Customer segmentation | LoyaltyCard aggregate fields | ✅ | DERIVABLE | New/Loyal/High-value/Frequent/Inactive/At-risk (rules-based, already partially seeded) |
| Age / gender demographics | User.DateOfBirth, User.Gender | ✅ | AVAILABLE | Already computed in `AdminCustomerAnalyticsResponse` |

## 7. Staff analytics

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Stamps issued by staff | Stamp.AwardedByUserId | ✅ | AVAILABLE | Direct count (nullable for old stamps — see below) |
| Today/week/month stamps by staff | Stamp.AwardedByUserId + StampedAt | ✅ | AVAILABLE | Date-filtered count |
| Customers served by staff | Stamp.AwardedByUserId → Card.CustomerId | ✅ | AVAILABLE | Distinct count |
| Total stamps (lifetime) by staff | Stamp.AwardedByUserId | ⚠️ Partial | PARTIALLY AVAILABLE | Older stamps have AwardedByUserId = null; attribution is incomplete historically. |
| New vs returning customers served | Stamp + card history | ⚠️ Partial | PARTIALLY AVAILABLE | Can derive from first stamp per customer, but staff attribution on old stamps is missing. |
| Staff utilization | — | ❌ | NOT AVAILABLE | No "working hours / availability" concept. No shift schedule. Cannot compute utilization % against working hours. |
| Revenue per staff | — | ❌ | NOT AVAILABLE | Redemption has no staff FK; reward-value attribution to staff is approximate at best. |
| Average appointment value | — | ❌ | NOT AVAILABLE | No appointments / transactions. |
| Customer ratings / satisfaction | — | ❌ | NOT AVAILABLE | No reviews exist. |
| Staff productivity trends | Stamp.AwardedByUserId + StampedAt | ✅ | DERIVABLE | Time-series of stamps/staff |
| Staff Roster (working hours) | — | ❌ | NOT AVAILABLE | No schedule entity |

## 8. Referral analytics

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Total referrals sent | Referral | ✅ | AVAILABLE | Count |
| Referral funnel (sent → activated → qualified → rewarded) | Referral.Status + timestamps | ✅ | AVAILABLE | Status + ActivatedAt/QualifiedAt/RewardedAt |
| Referral conversion rate | Referral status counts | ✅ | DERIVABLE | Status proportions |
| Referrals by staff/business | Referral.BusinessId / ReferrerId | ✅ | AVAILABLE | Scope by business |
| Reward-value of referrals | ReferralProgram.RewardValue | ✅ | AVAILABLE | Cost of referral payouts |
| Referral expiration | Referral.ExpiresAt | ✅ | AVAILABLE | Count expired |
| Viral coefficient | Referral counts | ✅ | DERIVABLE | (qualified referrals) / (active referrers) |
| Referral cohort retention | Referral + Stamp | ✅ | DERIVABLE | Compare referee's subsequent stamp activity |

## 9. Platform / Admin analytics

| Metric | Source | Current data? | Verdict | Reason |
|---|---|---|---|---|
| Business growth (new/churned) | Business.CreatedAt | ✅ | AVAILABLE | New per period. Churn = business deleted (no soft-delete, so churn history is lost after hard delete ⚠️) |
| Business churn | Business (deleted) | ⚠️ | PARTIALLY AVAILABLE | No soft-delete; churned businesses vanish. Needs archival. |
| Platform engagement | Stamp | ✅ | AVAILABLE | Daily/monthly active stamp count |
| Category performance | Business.Category + Stamp counts | ✅ | AVAILABLE | Already in `CategoryBreakdown` |
| Top / declining businesses | Stamp + Redemption trends | ✅ | AVAILABLE | Requires period-over-period (currently missing — DERIVABLE) |
| Feature usage | — | ❌ | NOT AVAILABLE | No API usage / endpoint telemetry table |
| API error rates | ILogger (Serilog) | ⚠️ Ephemeral | PARTIALLY AVAILABLE | Logs exist but not persisted to a queryable table. No error-rate metric store. |
| Authentication success/failure | UserAuth.FailedLoginAttempts, LastLoginAt | ✅ | AVAILABLE | Partial (failed attempts tracked per account; not centralized per-endpoint) |

## 10. Cross-domain / composite insights

| Insight | Source | Verdict | Requires |
|---|---|---|---|
| Which programs drive highest completion? | LoyaltyProgram + LoyaltyCard.LifetimeStamps | AVAILABLE | Aggregation |
| Which staff produce the most reward-ready customers? | Stamp.AwardedByUserId → card completion | PARTIALLY AVAILABLE | Staff attribution on old stamps |
| Which programs drive repeat visits? | Stamp sequence per ProgramId | AVAILABLE | Window functions |
| Which customers are at-risk of churning? | LoyaltyCard.LastStampAt | AVAILABLE | Days-since filter |
| Which referrals convert to high-value customers? | Referral + LoyaltyCard.LifetimeStamps | AVAILABLE | Join |
| Do rewards drive retention? | Redemption.RedeemedAt → subsequent stamps | AVAILABLE | Cohort analysis |

## Summary

| Class | Count (key metrics) |
|---|---|
| AVAILABLE | ~45 (volume, funnel steps, demographics, churn, staff attribution, referral lifecycle, platform growth) |
| DERIVABLE | ~20 (aggregations, trends, funnel completion, cadence, viral coefficient, cohort retention, time-series) |
| PARTIALLY AVAILABLE | ~12 (staff attribution for old stamps, reward-value-per-staff, PaidAt/payout pipeline, working-hours utilization, reviews-driven satisfaction, business soft-delete/churn history, program versioning) |
| NOT AVAILABLE | ~18 (customer spend/LTV, appointments, cancellations/no-shows, payment methods, refunds, deposits, reviews/ratings, staff working-hours schedule, API/error telemetry table, program version history, acquisition source, notification persistence) |
