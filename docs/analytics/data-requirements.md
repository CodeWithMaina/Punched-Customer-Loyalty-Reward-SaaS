# Data Requirements

New tables/fields/events required to support the complete analytics system. Each entry
references the metric(s) that depend on it.

## R1. Analytics snapshot tables (P0)

Purpose: Avoid recomputing daily aggregates on hot tables. Precomputed per `(business_id,
day)` for stamps and redemptions.

### `business_daily_analytics` (P0)
A materialized/ETL table refreshed daily (and incrementally, near-real-time for the
current day).

| Column | Type | Description | Source |
|---|---|---|---|
| `business_id` | uuid | PK | Business |
| `date` | date | PK | date trunc |
| `stamps` | int | visits that day | Stamp.StampedAt |
| `distinct_customers` | int | distinct customers with a stamp | Stamp→Card |
| `new_enrollments` | int | cards enrolled | LoyaltyCard.EnrolledAt |
| `redemptions` | int | rewards earned | Redemption.RedeemedAt |
| `payout_kes` | numeric(12,2) | SUM(Redemption.RewardValue) | Redemption |
| `accrued_liability_kes` | numeric(12,2) | Σ(TotalStamps * RewardValue/StampsRequired) | Card+Program |
| `reward_ready_customers` | int | cards reaching threshold | LoyaltyCard |

- **Refreshed:** incremental near-real-time (stamp redemption) for "today"; batch daily
  for closed days.
- **Indexes:** PK `(business_id, date)`; `(business_id, date DESC)`.

### `staff_daily_analytics` (P1)
| Column | Type | Description |
|---|---|---|
| `staff_user_id` | uuid PK | Stamp.AwardedByUserId |
| `business_id` | uuid | scope |
| `date` | date PK | |
| `stamps` | int | |
| `distinct_customers` | int | |
| `new_customers` | int | first visit by staff |
| `reward_ready_created` | int | cards reaching threshold via this staff |

## R2. Soft-delete / churn tracking (P1)

Current `Business` and `User` are hard-deleted → churn history is lost. Add:

- `Business.IsDeleted` (bool, default false) + `DeletedAt` (DateTime?) +
  index `(OwnerId, IsDeleted)`.
- `User.IsDeleted` (bool, default false) + `DeletedAt`.
- Update `DeleteBusinessAsync`/`DeleteUserAsync` to soft-delete (mark) instead of hard-delete.
- `AdminDashboardResponse.ChurnedBusinesses` becomes accurate.

## R3. Redemption payout pipeline (P0 — critical anomaly fix)

Problem: `Redemption.Status` is always `"completed"` and `PaidAt` is always `null` in
production code (`StampService` and `RedemptionService` set status directly).

Required changes:
1. `StampService` / `RedemptionService`: create redemptions with `Status = "pending"`.
2. Add a payout background worker (`PayoutService`) that:
   - Sets `Status = "processing"`, calls M-Pesa, sets `MpesaRef`, then
   - Sets `PaidAt`, `Status = "completed"` (or `"failed"` on error).
3. This makes `M28`, `INSIGHT-15`, `M21` (payout accuracy) meaningful.

## R4. Staff working-hours / roster (P2)

Required for **true utilization** (M61, INSIGHT-16, "underutilized hours" accuracy).

Table `staff_shifts`:
| Column | Type |
|---|---|
| `staff_user_id` | uuid |
| `business_id` | uuid |
| `date` | date |
| `start_hour` | int (0–23) |
| `end_hour` | int (0–23) |
| `IsWorking` | bool |

Index: `(staff_user_id, date)`, `(business_id, date)`.

## R5. Acquisition source tracking (P2)

Required for **acquisition analytics** (M14 cohort source, INSIGHT-20).

Add to `User` / `UserAuth`:
- `SourceProvider` (string?) — e.g., "google", "apple", "referral", "organic"
- `SourceCampaign` (string?)
Capture at registration via optional request fields / UTM passthrough.

## R6. Notification persistence (P2)

Required for **notification analytics** (delivery/opened tracking, INSIGHT engine email metrics).

Table `notifications`:
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid |
| `business_id` | uuid (nullable) |
| `channel` | string (email/sms/push) |
| `template_type` | string |
| `status` | string (sent/delivered/failed/opened) |
| `sent_at` | DateTime |
| `delivered_at` | DateTime? |
| `opened_at` | DateTime? |
| `error` | string? |

Index: `(user_id, sent_at)`, `(business_id, template_type)`, `(status, sent_at)`.

## R7. Review / rating domain (P3)

Required for **customer satisfaction** (M63, staff ratings).

Table `reviews`:
| Column | Type |
|---|---|
| `id` | uuid PK |
| `business_id` | uuid |
| `customer_id` | uuid |
| `staff_user_id` | uuid? |
| `rating` | int (1–5) |
| `comment` | string? |
| `created_at` | DateTime |

## R8. Appointment domain (FUTURE)

Required for full "appointment analytics" (cancellations, no-shows, capacity).
Proposed scaffold already exists in `seed-scaffold-proposals.md`. Key tables:
`appointments`, `appointment_status_history`, `services`, `staff_services`.
Not required for the loyalty-only analytics MVP.

## R9. Event log (P2 — platform health)

Required for **admin platform-health analytics** (M76, M77, feature-usage drop-off).

Table `api_event_logs`:
| Column | Type |
|---|---|
| `id` | uuid PK (or bigint) |
| `tenant_id` | uuid? (business) |
| `user_id` | uuid? |
| `endpoint` | string |
| `method` | string |
| `status_code` | int |
| `duration_ms` | int |
| `error_code` | string? |
| `created_at` | DateTime |

Index: `(created_at DESC)`, `(business_id, created_at)`, `(status_code)`.

## R10. Loyalty program versioning (P2)

Current `LoyaltyProgram` fields mutate with no history. Add `loyalty_program_history`
(table-per-change) recording `stamps_required`, `reward_value`, `reward_description`,
`effective_from`, `effective_to`. Required for accurate "program change impact" and
fair customer segmentation.

## R11. Customer segmentation entity (P1)

Table `customer_segments` (materialized nightly):
| Column | Type |
|---|---|
| `business_id` | uuid |
| `customer_id` | uuid |
| `segment` | string (new/active/at_risk/dormant/churned/high_value/loyal/frequent) |
| `score` | int (0–100) |
| `computed_at` | DateTime |
| `last_stamp_at` | DateTime? |

Index: `(business_id, segment)`, `(business_id, customer_id)`.

## R12. Insights table (P1)

Table `insights`:
| Column | Type |
|---|---|
| `id` | uuid PK |
| `audience` | string (business/staff/customer/admin) |
| `business_id` | uuid? |
| `category` | string |
| `metric` | string |
| `severity` | string (HIGH/MEDIUM/LOW) |
| `confidence` | string (HIGH/MEDIUM/LOW) |
| `title` | string |
| `message` | string |
| `recommendation` | string |
| `data_json` | jsonb |
| `generated_at` | DateTime |
| `expires_at` | DateTime |
| `dismissed` | bool |
| `dismissed_at` | DateTime? |
| `dismissed_by` | uuid? |

Index: `(audience, business_id, generated_at)`, `(business_id, dismissed, severity)`.
