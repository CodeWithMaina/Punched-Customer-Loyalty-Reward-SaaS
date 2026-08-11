# Insight Engine

## Purpose

Analytics must not be just static charts. The Insight Engine dynamically generates
**actionable, contextual business recommendations** from raw data, scoped per audience,
and surfaced in-app (and via email/SMS).

The engine is a rule-based generator (no ML required for v1). Each insight is a
`(audience, trigger, calculation, severity, message, action)` tuple. Rules are
evaluated by a daily background job that writes a compact `Insight` record (proposed in
`data-requirements.md`), and/or computed on-demand for dashboards requiring freshness.

## Insight lifecycle

```
1. Evaluate rules (daily job / on-demand)
2. Compute threshold check
3. If trigger met → create Insight{ audience, category, metric, severity, confidence,
   message, recommendation, data }
4. Store in insights table (or return live)
5. Surface in UI widget + optional notification
6. Acknowledge / dismiss / snooze → state tracked
7. Re-evaluate (next cycle); insight expires if condition no longer holds
```

## Insight severity & confidence

| Severity | Meaning | Action expectation |
|---|---|---|
| HIGH | Requires action within 24–48h | Push notification |
| MEDIUM | Worth attention this week | Dashboard widget |
| LOW | Context / FYI | Optional widget |

| Confidence | When used |
|---|---|
| HIGH | Based on hard data (e.g., X customers >90 days dormant) |
| MEDIUM | Based on trend/trend reversal (3 consecutive periods) |
| LOW | Based on short window or inference (cadence) |

---

# Insight Catalog

## A. Performance / Growth insights

### INSIGHT-01 — Business growth
- **Audience:** Business Owner, Admin
- **Trigger:** period-over-period stamp growth
- **Calculation:** `(stampsThis - stampsPrev) / stampsPrev * 100` where stamps per period
  from `Stamp.StampedAt` grouped by day; aggregate 30d windows
- **Threshold:** changePct != 0 (show magnitude & direction)
- **Severity:** MEDIUM (positive) / HIGH (decline)
- **Confidence:** HIGH
- **Message:** "Visits {increased|decreased} 14% compared with last month ({current} vs {previous})."
- **Action:** If rising → scale staff; if falling → launch re-engagement push.
- **Data:** Stamp.StampedAt (DERIVABLE)

### INSIGHT-02 — Revenue (reward-payout) growth
- **Audience:** Business Owner, Admin
- **Trigger:** period-over-period reward payout (KES)
- **Calculation:** `SUM(Redemption.RewardValue)` per period, PoP
- **Threshold:** changePct >= 10 (rising) or <= -10 (falling)
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Message:** "Reward payouts {increased|decreased} 14% vs last month."
- **Action:** Investigate program value or completion rates.
- **Data:** Redemption.RedeemedAt, RewardValue (DERIVABLE). ⚠️ depends on PaidAt fix for payout accuracy (see data-gaps).

## B. Customer insights

### INSIGHT-03 — Dormant customers (at-risk)
- **Audience:** Business Owner, Admin
- **Trigger:** customers with no stamps in last 30 days
- **Calculation:** `COUNT(card WHERE LastStampAt < now-30d)`
- **Threshold:** >0; surface count + % of base
- **Severity:** HIGH (if ≥5% of base inactive) / MEDIUM
- **Confidence:** HIGH
- **Message:** "{N} customers who normally book every {avg cadence} days are now overdue."
- **Action:** Targeted re-engagement campaign / push notification.
- **Data:** LoyaltyCard.LastStampAt, Stamp.StampedAt (cadence). AVAILABLE.

### INSIGHT-04 — Returning-customer rate change
- **Audience:** Business Owner, Admin
- **Trigger:** month-over-month returning-customer rate
- **Calculation:** `returningCustomers / activeCustomers`; compare current vs prior month
- **Threshold:** drop of ≥5 percentage points
- **Severity:** HIGH
- **Confidence:** HIGH
- **Message:** "Your returning-customer rate dropped {Δ} this month ({cur}% vs {prev}%)."
- **Action:** Diagnose funnel; incentivize 2nd-visit.
- **Data:** LoyaltyCard.LifetimeStamps>1, LastStampAt. AVAILABLE.

### INSIGHT-05 — High-value customer churn risk
- **Audience:** Business Owner
- **Trigger:** top-10% by LifetimeStamps inactive >30d
- **Calculation:** highValue = cards in 90th pct of LifetimeStamps; `LastStampAt < now-30d`
- **Threshold:** ≥1
- **Severity:** HIGH
- **Confidence:** HIGH
- **Message:** "{N} high-value customers haven't visited in the last 30 days."
- **Action:** Personal outreach / VIP perk.
- **Data:** LoyaltyCard.LifetimeStamps, LastStampAt. AVAILABLE.

### INSIGHT-06 — Customer segment: new cohort health
- **Audience:** Business Owner
- **Trigger:** new customers (last 30d) — % who returned for 2nd visit
- **Calculation:** `COUNT(new cards with ≥2 stamps) / COUNT(new cards)`
- **Threshold:** <20% (concerning) / >50% (strong)
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Message:** "Of {N} customers who joined this month, {X}% returned for a second visit."
- **Data:** LoyaltyCard.EnrolledAt + Stamps. AVAILABLE.

## C. Staff insights

### INSIGHT-07 — Staff overload / underutilization
- **Audience:** Business Owner
- **Trigger:** staff stamp volume imbalance
- **Calculation:** rank staff by `COUNT(Stamp WHERE AwardedByUserId= staff)` over period;
  normalized = stamps per active day
- **Threshold:** top vs bottom quartile disparity >2x (note: without shift scheduling,
  true "utilization" is unavailable — this measures throughput disparity)
- **Severity:** MEDIUM
- **Confidence:** MEDIUM (attribution gaps for old stamps)
- **Message:** "Staff {A} issued {X} stamps/day vs {B}'s {Y} — check scheduling."
- **Action:** Rebalance staffing / review training.
- **Data:** Stamp.AwardedByUserId, StampedAt (PARTIALLY AVAILABLE — attribution).

### INSIGHT-08 — Unusual cancellation pattern
- **Audience:** Business Owner
- **Trigger:** —
- **Calculation:** N/A (no cancellations in punch model)
- **Threshold:** N/A
- **Severity:** LOW
- **Confidence:** N/A
- **Message:** "Cancellation analytics require an appointments domain (not yet implemented)."
- **Data:** none. NOT AVAILABLE until appointments exist.

## D. Service / Program insights

### INSIGHT-09 — Program declining
- **Audience:** Business Owner
- **Trigger:** program completion rate trending down
- **Calculation:** `cards with LifetimeStamps>=StampsRequired / total cards` per program,
  period-over-period
- **Threshold:** decline ≥10% over 2 periods
- **Severity:** HIGH
- **Confidence:** HIGH
- **Message:** "Program '{name}' accounts for {share}% of completions but bookings/stamps have declined {Δ}%."
- **Action:** Review reward value; promote the program.
- **Data:** LoyaltyCard+Program. AVAILABLE.

### INSIGHT-10 — Reward expiry risk
- **Audience:** Business Owner, Customer
- **Trigger:** cards with `RewardExpiresAt` approaching / passed and TotalStamps>0
- **Calculation:** `COUNT(card WHERE RewardExpiresAt ∈ [now, now+2d])`
- **Threshold:** >0
- **Severity:** HIGH (business) / MEDIUM (customer)
- **Confidence:** HIGH
- **Message:** "{N} customers have reward-ready cards expiring within 2 days."
- **Action:** Notify customers to redeem; review expiry policy.
- **Data:** LoyaltyCard.RewardExpiresAt. PARTIALLY AVAILABLE (no auto-expiry job).

## E. Appointment / visit insights (mapped to stamps)

### INSIGHT-11 — Peak vs trough
- **Audience:** Business Owner, Staff
- **Trigger:** hourly stamp distribution
- **Calculation:** `COUNT(Stamp) GROUP BY hour`; peak = max hour, trough = min non-zero hour
- **Threshold:** peak/trough ratio ≥3
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Message:** "{peak}:00 is your busiest hour; {trough}:00 is underutilized."
- **Action:** Staff peak; run promo at trough.
- **Data:** Stamp.StampedAt. AVAILABLE.

### INSIGHT-12 — Weekend vs weekday demand
- **Audience:** Business Owner
- **Trigger:** day-of-week distribution
- **Calculation:** compare weekend stamps vs weekday average
- **Threshold:** weekend >150% of weekday avg (opportunity to extend hours)
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Message:** "Weekend demand is {X}% above weekday average — consider extra hours."
- **Action:** Add weekend staffing.
- **Data:** Stamp.StampedAt (DOW). AVAILABLE.

## F. Retention insights

### INSIGHT-13 — Reward redemption drives retention
- **Audience:** Business Owner
- **Trigger:** compare subsequent stamp count for redeemers vs non-redeemers
- **Calculation:** after first redemption, avg stamps in next 30d (redeemers) vs cards
  with ≥threshold-but-not-redeemed
- **Threshold:** redeemers show higher subsequent activity
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **Message:** "Customers who redeem rewards are {X}x more likely to return within 30 days."
- **Action:** Encourage redemption to boost retention.
- **Data:** Redemption.RedeemedAt + subsequent Stamps. AVAILABLE.

### INSIGHT-14 — Referral → high-value customer
- **Audience:** Business Owner
- **Trigger:** referred vs non-referred customer value
- **Calculation:** avg LifetimeStamps for referees (via Referral.RefereeId→LoyaltyCard)
  vs non-referrals
- **Threshold:** referred > non-referred
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **Message:** "Referred customers are {X}x more valuable (by stamps) than average."
- **Action:** Invest in referral rewards.
- **Data:** Referral + LoyaltyCard. AVAILABLE.

## G. Risk insights

### INSIGHT-15 — Reward payout pipeline stall
- **Audience:** Business Owner
- **Trigger:** rewards earned but never marked paid
- **Calculation:** `COUNT(Redemption WHERE PaidAt IS NULL AND RedeemedAt < now-7d)`
- **Threshold:** >0
- **Severity:** HIGH
- **Confidence:** HIGH (if PaidAt tracking is fixed)
- **Message:** "{N} rewards were earned over 7 days ago but not yet paid out."
- **Action:** Reconcile with payout provider / fix payout flow.
- **Data:** Redemption.PaidAt (PARTIALLY AVAILABLE — must fix PaidAt gap).

## H. Opportunity insights

### INSIGHT-16 — Lost revenue estimate (idle capacity)
- **Audience:** Business Owner
- **Trigger:** underutilized hours with existing demand pattern
- **Calculation:** avg stamp value/hour × idle hours × typical fill-rate lift
- **Threshold:** idle hours exist + >0 idle slots
- **Severity:** MEDIUM
- **Confidence:** LOW (no working-hours data)
- **Message:** "Extending {trough}-hour coverage by 2h could add ~{est}KES/month."
- **Action:** Add staff hours.
- **Data:** Stamp.StampedAt (⚠️ needs staff schedule for true capacity).

### INSIGHT-17 — Cross-program synergy
- **Audience:** Business Owner
- **Trigger:** customers on program A also do program B
- **Calculation:** (future) once multi-card cross-program joins exist
- **Threshold:** N/A
- **Severity:** LOW
- **Confidence:** N/A
- **Message:** "Feature not available until customer segmentation model ships."
- **Data:** NOT AVAILABLE yet.

## Platform-level admin insights

### INSIGHT-18 — Declining businesses
- **Audience:** Admin
- **Trigger:** negative 30-day stamp trend
- **Calculation:** `COUNT(business where stampsThis30 < stampsPrev30)`
- **Threshold:** >0
- **Severity:** HIGH
- **Confidence:** HIGH
- **Message:** "{N} businesses showed declining engagement this month."
- **Action:** Proactive support / churn-prevention.
- **Data:** Stamp.StampedAt scoped per business. AVAILABLE.

### INSIGHT-19 — High-churn-risk businesses
- **Audience:** Admin
- **Trigger:** businesses with no activity in 14 days
- **Calculation:** `COUNT(business WHERE lastStamp < now-14d)`
- **Threshold:** >0
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Message:** "{N} businesses have been inactive for 14+ days."
- **Action:** Outreach to prevent churn.
- **Data:** Stamp→Card→Business. AVAILABLE.

### INSIGHT-20 — Acquisition source insight
- **Audience:** Admin
- **Trigger:** —
- **Calculation:** N/A
- **Threshold:** N/A
- **Severity:** LOW
- **Confidence:** N/A
- **Message:** "Acquisition-source analytics require a source-tag field (not yet captured)."
- **Data:** NOT AVAILABLE.

## Engine design summary

| Aspect | Decision |
|---|---|
| Engine type | Rule-based evaluator (C#), runnable as daily job + on-demand |
| Storage | Proposed `insights` table (see data-requirements) for state/history; OR live computation for dashboards |
| Freshness | Daily for email; near-real-time for dashboard widgets |
| Scope filtering | By audience claim → tenant/business/staff/customer |
| Extensibility | Each rule = class implementing `IInsightRule`; rule registry injects per-audience |
| Confidence | Hard-coded per rule, refined later |
| Dismissal | `dismissed_at`, `dismissed_by` columns; snooze via `expires_at` |
