# Punched Platform — Analytics Specification

> **Version:** 1.0 (specification only — not yet implemented)
> **Status:** Phase 0 audit → Phase 6 roadmap
> **Scope:** Backend API analytics only (`/PunchedApi`). No frontend code was modified.

## What this is

This directory is a complete analytics and business-intelligence specification for the
**Punched** customer-loyalty / rewards SaaS platform. It was produced by auditing the
API/backend codebase only (entities, DTOs, services, controllers, migrations, seed data).

It defines **what can be calculated today**, **what is missing**, and **how to build the
full analytics product** across four user audiences: **Business Owner / Manager**,
**Staff**, **Platform Administrator**, and **Customer**.

## How this maps to the platform's domain

The generic analytics template (appointments, services, payments, reviews) has been
mapped to the *actual* Punched domain:

| Generic concept | Punched domain entity | Meaning |
|---|---|---|
| Visit / Booking | `Stamp` | Each stamp = one customer visit (QR scan) at a business |
| Service | `LoyaltyProgram` | The configured rewards program (N stamps -> reward) |
| Transaction / Revenue | `Redemption.RewardValue` | Reward payout value in KES (the business's cost) |
| Refund | Redemption `failed` status | A payout that failed |
| Staff | `User` (Role = Staff) | Employee who issues stamps (`Stamp.AwardedByUserId`) |
| Business | `User` (Role = Business) + `Business` | The merchant / location |
| Customer | `User` (Role = Customer) | The loyalty program member |
| Marketing | `ReferralProgram` / `ReferralLink` / `Referral` | Referral / viral growth engine |
| Notification | `IEmailService` | Fire-and-forget email (no persistence) |
| Audit log | `Stamp` (immutable) | Immutable stamp audit trail |

> **Important:** Punched currently has **no transactional revenue**. The platform
> tracks reward payout *cost* (KES), not customer spend. "Revenue analytics" in this
> spec is therefore framed as **Engagement Value & Reward Cost** analytics. True
> revenue tracking requires customer spend data (see `data-gaps.md`).

## Files

| File | Purpose |
|---|---|
| `system-overview.md` | Complete entity model, workflows, and data model reference |
| `analytics-data-audit.md` | AVAILABLE / DERIVABLE / PARTIAL / NOT AVAILABLE classification per metric |
| `business-analytics.md` | Business owner/manager analytics design |
| `staff-analytics.md` | Staff self-view analytics design |
| `admin-analytics.md` | Platform administrator analytics design |
| `customer-analytics.md` | Customer-facing analytics design |
| `metrics-catalog.md` | Exhaustive catalog of every metric with formula, source, priority |
| `insight-engine.md` | Dynamic automated insight engine design + insight catalog |
| `data-requirements.md` | New tables/fields/events to capture |
| `data-gaps.md` | Detailed gap analysis per missing metric |
| `api-design.md` | Proposed analytics endpoints, auth, shapes, performance |
| `security.md` | Tenant isolation audit and security requirements |
| `performance.md` | Indexes, caching, materialized views, query strategy |
| `implementation-plan.md` | Phased roadmap P0->P3 |

## Quick start

1. Read `system-overview.md` for the domain model.
2. Read `metrics-catalog.md` for every metric.
3. Read `data-gaps.md` for what must be built.
4. Follow `implementation-plan.md` for the build order.
