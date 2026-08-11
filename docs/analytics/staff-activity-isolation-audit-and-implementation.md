# Staff Activity Isolation Audit and Implementation

Date: 2026-08-07

## Scope audited

- API authentication and authorization
- Business and staff tenancy scoping
- Activity entities and attribution
- Stamp and redemption flows
- Referral side-effects that create reward actions
- Business and staff analytics endpoints
- Staff and owner dashboard frontend data flows

## A. Current Architecture Analysis

### Authentication and role identity

- JWT contains:
  - sub (UserAuth Id)
  - userId (User profile Id)
  - role (ClaimTypes.Role)
- Controllers commonly resolve actor identity from userId claim.
- Role authorization is enforced through Authorize attributes at controller and endpoint level.

### Business and staff representation

- Business ownership is represented by businesses.owner_id -> users.id.
- Staff tenancy is represented by users.StaffBusinessId -> businesses.id.
- Business context is not in token; it is derived server-side from:
  - owner_id for Business role
  - StaffBusinessId for Staff role

### Existing activity model before change

- Stamp already had AwardedByUserId attribution.
- Redemptions were linked to business and card, but actor attribution was not explicit.
- Staff analytics used Stamp.AwardedByUserId and mostly scoped correctly.
- Stamp awarding accepted request businessId and did not strictly verify actor-business match in service.

### Critical authorization weakness found

- Staff spoofing risk at stamp award path:
  - Request payload businessId could be manipulated.
  - Service did not always derive authoritative business scope from authenticated staff linkage before processing.

### Domain coverage findings

- Present in this codebase:
  - Scans/stamps
  - Redemptions
  - Referrals
  - Business/staff analytics
- Not present in this codebase (no entities/controllers/services):
  - Appointments
  - Payments processing
  - Service lifecycle management
  - Reviews/moderation
  - Generic customer interaction notes

## B. Staff Attribution Matrix

| Activity Source | Currently Attributed? | Existing Field | Required Change | Implemented |
|---|---:|---|---|---:|
| Stamp award | Yes | stamps.awarded_by_user_id | Enforce staff/business ownership at query-time and command-time | Yes |
| Redemption from stamp threshold | Partial | redemptions.user_id existed but implicit | Normalize actor attribution semantics and role marker | Yes |
| Customer claimed redemption | Partial | redemptions.user_id existed but implicit | Persist performed_by_role=Customer | Yes |
| Referral-issued redemption | No explicit role | none explicit | Persist performed_by_role=System | Yes |
| Staff analytics recent activity | Yes (stamp only) | awarded_by_user_id | Add strict business scoping + enrich activity records | Yes |
| Owner drill-down staff activity | Partial | owner had staff analytics only | Add dedicated activity feed endpoint with filters | Yes |

## C. Implementation Plan

### Database migrations

- Add performed_by_role to redemptions.
- Preserve historical actor uncertainty by keeping actor fields nullable.
- Reuse existing user FK column by mapping performer to redemptions.user_id.
- Add performance index for business + performer + timestamp filtering.

### Backend authorization and tenancy

- Always derive authoritative business scope from authenticated actor:
  - Staff -> users.StaffBusinessId
  - Business owner -> owned business by owner_id
- Reject stamp award if request businessId differs from derived scope.
- Never trust client-provided staff identity for staff endpoints.

### API additions

- Staff self activity endpoint:
  - GET /v1/businesses/staff/activity
- Owner drill-down endpoint:
  - GET /v1/businesses/me/staff/{staffId}/activity
- Both endpoints support filtering by:
  - activityType
  - customerId
  - from
  - to
  - status
  - page and pageSize

### Analytics changes

- Keep existing business-wide owner analytics.
- Strengthen staff analytics business scoping in all staff queries.
- Add unified activity feed that includes stamp and redemption actions for staff attribution.

### Frontend changes

- Staff activity page switched to self-scoped activity feed endpoint.
- Owner staff detail page now loads staff activity feed (stamp + redemption timeline).

### Testing strategy

- Add/extend integration tests for:
  - Staff cannot award for non-linked business.
  - Staff activity endpoint only returns caller-owned activity.
  - Owner can access linked staff activity only within own business.
  - Cross-business access is denied.
  - Query parameter tampering cannot bypass identity scope.

### Historical data strategy

- Keep performed_by_role nullable for legacy rows where actor role cannot be proven.
- Do not bulk-assign historical unattributed rows to arbitrary staff.

## D. Implemented Changes Summary

### Security and attribution

- Enforced actor-business scope validation in stamp awarding service.
- Added explicit performer role on redemptions.
- Persisted performer identity and role consistently across redemption creation paths.

### New activity APIs

- Added owner staff activity endpoint with filters and pagination.
- Added staff self activity endpoint with server-derived staff identity.
- Added combined timeline (stamp + redemption) and summary metrics.

### Frontend

- Staff activity page now shows self-attributed activity feed.
- Owner staff detail page now includes combined activity timeline from new endpoint.

## E. Verification Results

### Backend

- dotnet build: success.
- dotnet test: no dedicated test project discovered in solution scope during this run.

### Frontend

- npm install completed.
- next build reached application compilation successfully but failed on existing workspace-wide lint rules and pre-existing issues unrelated to this change set.
- No language-service errors remain in touched files after fixes.

## Files changed

- PunchedApi/API/Controllers/BusinessController.cs
- PunchedApi/API/Controllers/StampController.cs
- PunchedApi/Application/DTOs/BusinessDTOs.cs
- PunchedApi/Application/Services/BusinessService.cs
- PunchedApi/Application/Services/RedemptionService.cs
- PunchedApi/Application/Services/ReferralService.cs
- PunchedApi/Application/Services/StampService.cs
- PunchedApi/Domain/Entities/Redemption.cs
- PunchedApi/Domain/Interfaces/IBusinessService.cs
- PunchedApi/Infrastructure/Data/Configurations/RedemptionConfiguration.cs
- PunchedApi/Migrations/20260807153626_AddRedemptionPerformerAttribution.cs
- PunchedApi/Migrations/20260807153626_AddRedemptionPerformerAttribution.Designer.cs
- PunchedApi/Migrations/ApplicationDbContextModelSnapshot.cs
- punched-pwd/app/dashboard/business/staff/[staffId]/page.tsx
- punched-pwd/app/dashboard/staff/activity/page.tsx
- punched-pwd/lib/api/businesses.ts
- punched-pwd/types/index.ts
