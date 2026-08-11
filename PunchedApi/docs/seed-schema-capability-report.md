# Seed Schema Capability Report

Generated from current EF Core model and migrations.

## Implemented

- Users and authentication: `user_auth`, `users`, `refresh_tokens`
- Multi-tenant businesses: `businesses`
- Loyalty core: `loyalty_programs`, `loyalty_cards`, `qr_tokens`, `stamps`, `redemptions`
- Referral core: `referral_programs`, `referral_links`, `referrals`

## Partially Implemented

- Roles and permissions
  - `UserRole` enum exists.
  - No role/permission tables for granular permission seeding.
- Business settings
  - Basic business profile fields exist.
  - No dedicated booking policy, tax policy, notification preferences, or cancellation-policy entities.

## Missing / Blocked By Schema

- Appointment domain (appointments, status history, reminders, check-in, completion events)
- Service catalog domain (service categories, services, availability, staff assignments)
- Payment ledger and invoices (methods, deposits, refunds, split payments, taxes)
- Notification persistence (delivery/opened tracking)
- Reviews and replies
- Inventory domain (products, suppliers, stock, movements)
- Audit logs (user actions, entity changes)

## Referential Integrity Constraints Observed

- one-to-one: `users.email -> user_auth.email`
- one-to-many: `businesses -> loyalty_programs`
- uniqueness: one loyalty card per `(customer_id, business_id)`
- uniqueness: one referral link per `(referrer_id, business_id)` and unique code
- filtered unique: referrals `(referee_id, business_id)` when status is not `Expired`
- unique stamp source: one stamp per QR token

## Seeding Scope Decision

Only supported entities are seeded by the implementation. Unsupported domains are documented with scaffold proposals in `seed-scaffold-proposals.md`.
