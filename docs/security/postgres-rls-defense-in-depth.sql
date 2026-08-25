-- ══════════════════════════════════════════════════════════════════
--  Punched Loyalty — PostgreSQL Row-Level Security defense-in-depth
-- ══════════════════════════════════════════════════════════════════
-- Purpose: even if an application query accidentally omits the tenant
-- predicate, PostgreSQL refuses to return or modify rows outside the
-- caller's authorized business scope.
--
-- MODEL
--   * The API sets `app.business_id` per request using a TRANSACTION-scoped
--     GUC:  SELECT set_config('app.business_id', '<uuid>', true);
--     `is_local = true` means the setting dies with the transaction, so a
--     pooled connection can NEVER leak one tenant's context to the next.
--   * `punched_app`      — the application role. No BYPASSRLS.
--   * `punched_elevated` — background workers / admin analytics that are
--                          intentionally cross-tenant. Holds BYPASSRLS and
--                          must be granted ONLY to worker/admin connections.
--
-- ACTIVATION (staged, opt-in):
--   1. Run this script (idempotent) during a low-traffic window.
--   2. Point the API connection string at `punched_app` AND wrap each request
--      in an explicit transaction that first runs set_config(...) above.
--   3. Point workers/admin tooling at `punched_elevated`.
--   4. Verify with the cross-tenant tests in section 5 before prod rollout.
--
-- NOT enabled by application default today because: admin endpoints and
-- background workers (analytics aggregation, payout, cleanup, backfill,
-- seeding) legitimately operate across all tenants; switching them requires
-- the elevated-role plumbing described in the companion .md document.
--
-- TABLE NAME NOTES (verified against EF Core configurations):
--   ServiceCatalogItem        -> "services"
--   StaffServiceAssignment    -> "staff_services"
--   Notification              -> "notification_inbox"  (user inbox)
--   NotificationLog           -> "notifications"       (sent-message log)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Roles ────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'punched_app') THEN
        CREATE ROLE punched_app LOGIN PASSWORD 'set-a-strong-password';
        -- Deliberately NO SUPERUSER / NO BYPASSRLS / NO CREATEDB:
        ALTER ROLE punched_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'punched_elevated') THEN
        -- Cross-tenant workers/admin only. Treat its credentials as secrets.
        CREATE ROLE punched_elevated LOGIN PASSWORD 'set-a-strong-password' BYPASSRLS;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO punched_app, punched_elevated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO punched_app, punched_elevated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO punched_app, punched_elevated;

-- ── 2. Helper predicate (fail-closed) ───────────────────────────
CREATE OR REPLACE FUNCTION app_current_business_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.business_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '');
$$;


-- ── 3. Policies (tenant-owned tables) ───────────────────────────
DO $$
DECLARE
    t text;
BEGIN
    -- Tables carrying a direct business_id column.
    -- NOTE: "services" = ServiceCatalogItem, "staff_services" =
    -- StaffServiceAssignment, "notifications" = NotificationLog.
    FOREACH t IN ARRAY ARRAY[
        'loyalty_programs','loyalty_cards','redemptions','qr_tokens',
        'referral_programs','referral_links','referrals',
        'reviews','staff_shifts',
        'services','staff_services','customer_segments','insights',
        'staff_invitations',
        'staff_daily_analytics','business_daily_analytics'
    ] LOOP
        EXECUTE format($f$
            DROP POLICY IF EXISTS tenant_isolation ON %I;
            CREATE POLICY tenant_isolation ON %I
                FOR ALL
                USING (business_id = app_current_business_id())
                WITH CHECK (business_id = app_current_business_id());
        $f$, t, t);
    END LOOP;
END $$;

-- Stamps: scoped through the loyalty card.
DROP POLICY IF EXISTS tenant_isolation ON stamps;
CREATE POLICY tenant_isolation ON stamps
    FOR ALL
    USING (card_id IN (SELECT id FROM loyalty_cards WHERE business_id = app_current_business_id()))
    WITH CHECK (card_id IN (SELECT id FROM loyalty_cards WHERE business_id = app_current_business_id()));

-- Appointments & children.
DROP POLICY IF EXISTS tenant_isolation ON appointments;
CREATE POLICY tenant_isolation ON appointments
    FOR ALL
    USING (business_id = app_current_business_id())
    WITH CHECK (business_id = app_current_business_id());

DROP POLICY IF EXISTS tenant_isolation ON appointment_status_history;
CREATE POLICY tenant_isolation ON appointment_status_history
    FOR ALL
    USING (appointment_id IN (SELECT id FROM appointments WHERE business_id = app_current_business_id()))
    WITH CHECK (appointment_id IN (SELECT id FROM appointments WHERE business_id = app_current_business_id()));

DROP POLICY IF EXISTS tenant_isolation ON appointment_resources;
CREATE POLICY tenant_isolation ON appointment_resources
    FOR ALL
    USING (appointment_id IN (SELECT id FROM appointments WHERE business_id = app_current_business_id()))
    WITH CHECK (appointment_id IN (SELECT id FROM appointments WHERE business_id = app_current_business_id()));

-- loyalty_program_history has no business_id; scope it through the parent program.
DROP POLICY IF EXISTS tenant_isolation ON loyalty_program_history;
CREATE POLICY tenant_isolation ON loyalty_program_history
    FOR ALL
    USING (loyalty_program_id IN (SELECT id FROM loyalty_programs WHERE business_id = app_current_business_id()))
    WITH CHECK (loyalty_program_id IN (SELECT id FROM loyalty_programs WHERE business_id = app_current_business_id()));

-- Businesses themselves: a user may see/modify only the business they own.
DROP POLICY IF EXISTS owner_isolation ON businesses;
CREATE POLICY owner_isolation ON businesses
    FOR ALL
    USING (owner_id::text = app_current_user_id())
    WITH CHECK (owner_id::text = app_current_user_id());

-- Users: staff may read rows linked to their business; users read/update their own row.
-- NOTE: "StaffBusinessId" exists in the live schema in PascalCase (schema drift
-- from an early migration); quote it exactly as-is.
DROP POLICY IF EXISTS user_isolation ON users;
CREATE POLICY user_isolation ON users
    FOR SELECT
    USING (
        id::text = app_current_user_id()
        OR "StaffBusinessId" = app_current_business_id()
    );
CREATE POLICY user_self_update ON users
    FOR UPDATE
    USING (id::text = app_current_user_id())
    WITH CHECK (id::text = app_current_user_id());

-- notification_inbox (= Notification entity): rows belong to one user and one business.
DROP POLICY IF EXISTS inbox_isolation ON notification_inbox;
CREATE POLICY inbox_isolation ON notification_inbox
    FOR ALL
    USING (
        user_id::text = app_current_user_id()
        OR business_id = app_current_business_id()
    )
    WITH CHECK (
        user_id::text = app_current_user_id()
        OR business_id = app_current_business_id()
    );

-- notifications (= NotificationLog): business-scoped sent-message log.
DROP POLICY IF EXISTS tenant_isolation ON notifications;
CREATE POLICY tenant_isolation ON notifications
    FOR ALL
    USING (business_id = app_current_business_id())
    WITH CHECK (business_id = app_current_business_id());

-- ── 4. Turn it on (non-owner roles) ─────────────────────────────
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'businesses','users','loyalty_programs','loyalty_cards','stamps',
        'redemptions','qr_tokens','referral_programs','referral_links',
        'referrals','notification_inbox','notifications','reviews',
        'staff_shifts','appointments','appointment_status_history',
        'appointment_resources','services',
        'staff_services','customer_segments','insights',
        'loyalty_program_history','staff_daily_analytics',
        'business_daily_analytics','staff_invitations'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- ── 5. Verification queries (run as punched_app) ────────────────
--   BEGIN;
--     SELECT set_config('app.business_id', '<business-A-uuid>', true);
--     SELECT count(*) FROM loyalty_cards;            -- only Business A rows
--     SELECT set_config('app.business_id', '<business-B-uuid>', true);
--     UPDATE loyalty_cards SET total_stamps = 0;     -- still only Business B rows
--   ROLLBACK;   -- context dies here: pooled connections never leak scope

