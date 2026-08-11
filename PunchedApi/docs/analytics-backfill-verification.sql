-- P1/P2 hardening verification script
-- Scope: FK integrity and analytics backfill correctness
-- Database: PostgreSQL

-- ---------------------------------------------------------------------
-- Configure verification window (UTC dates)
-- ---------------------------------------------------------------------
WITH params AS (
    SELECT
        (CURRENT_DATE - INTERVAL '30 days')::date AS start_date,
        CURRENT_DATE::date AS end_date
)
SELECT start_date, end_date FROM params;

-- ---------------------------------------------------------------------
-- 1) Foreign-key orphan preflight checks (all should be 0)
-- ---------------------------------------------------------------------
SELECT 'business_daily_analytics.business_id -> businesses.id' AS check_name,
       COUNT(*) AS orphan_count
FROM business_daily_analytics bda
LEFT JOIN businesses b ON b.id = bda.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'staff_daily_analytics.staff_user_id -> users.id', COUNT(*)
FROM staff_daily_analytics sda
LEFT JOIN users u ON u.id = sda.staff_user_id
WHERE u.id IS NULL

UNION ALL
SELECT 'staff_daily_analytics.business_id -> businesses.id', COUNT(*)
FROM staff_daily_analytics sda
LEFT JOIN businesses b ON b.id = sda.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'staff_shifts.staff_user_id -> users.id', COUNT(*)
FROM staff_shifts ss
LEFT JOIN users u ON u.id = ss.staff_user_id
WHERE u.id IS NULL

UNION ALL
SELECT 'staff_shifts.business_id -> businesses.id', COUNT(*)
FROM staff_shifts ss
LEFT JOIN businesses b ON b.id = ss.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'notifications.user_id -> users.id', COUNT(*)
FROM notifications n
LEFT JOIN users u ON u.id = n.user_id
WHERE u.id IS NULL

UNION ALL
SELECT 'notifications.business_id -> businesses.id', COUNT(*)
FROM notifications n
LEFT JOIN businesses b ON b.id = n.business_id
WHERE n.business_id IS NOT NULL AND b.id IS NULL

UNION ALL
SELECT 'reviews.business_id -> businesses.id', COUNT(*)
FROM reviews r
LEFT JOIN businesses b ON b.id = r.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'reviews.customer_id -> users.id', COUNT(*)
FROM reviews r
LEFT JOIN users u ON u.id = r.customer_id
WHERE u.id IS NULL

UNION ALL
SELECT 'reviews.staff_user_id -> users.id', COUNT(*)
FROM reviews r
LEFT JOIN users u ON u.id = r.staff_user_id
WHERE r.staff_user_id IS NOT NULL AND u.id IS NULL

UNION ALL
SELECT 'api_event_logs.tenant_id -> businesses.id', COUNT(*)
FROM api_event_logs ael
LEFT JOIN businesses b ON b.id = ael.tenant_id
WHERE ael.tenant_id IS NOT NULL AND b.id IS NULL

UNION ALL
SELECT 'api_event_logs.user_id -> users.id', COUNT(*)
FROM api_event_logs ael
LEFT JOIN users u ON u.id = ael.user_id
WHERE ael.user_id IS NOT NULL AND u.id IS NULL

UNION ALL
SELECT 'loyalty_program_history.loyalty_program_id -> loyalty_programs.id', COUNT(*)
FROM loyalty_program_history lph
LEFT JOIN loyalty_programs lp ON lp.id = lph.loyalty_program_id
WHERE lp.id IS NULL

UNION ALL
SELECT 'loyalty_program_history.changed_by_user_id -> users.id', COUNT(*)
FROM loyalty_program_history lph
LEFT JOIN users u ON u.id = lph.changed_by_user_id
WHERE lph.changed_by_user_id IS NOT NULL AND u.id IS NULL

UNION ALL
SELECT 'customer_segments.business_id -> businesses.id', COUNT(*)
FROM customer_segments cs
LEFT JOIN businesses b ON b.id = cs.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'customer_segments.customer_id -> users.id', COUNT(*)
FROM customer_segments cs
LEFT JOIN users u ON u.id = cs.customer_id
WHERE u.id IS NULL

UNION ALL
SELECT 'insights.business_id -> businesses.id', COUNT(*)
FROM insights i
LEFT JOIN businesses b ON b.id = i.business_id
WHERE i.business_id IS NOT NULL AND b.id IS NULL

UNION ALL
SELECT 'insights.dismissed_by -> users.id', COUNT(*)
FROM insights i
LEFT JOIN users u ON u.id = i.dismissed_by
WHERE i.dismissed_by IS NOT NULL AND u.id IS NULL

UNION ALL
SELECT 'appointments.business_id -> businesses.id', COUNT(*)
FROM appointments a
LEFT JOIN businesses b ON b.id = a.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'appointments.customer_id -> users.id', COUNT(*)
FROM appointments a
LEFT JOIN users u ON u.id = a.customer_id
WHERE u.id IS NULL

UNION ALL
SELECT 'appointments.staff_user_id -> users.id', COUNT(*)
FROM appointments a
LEFT JOIN users u ON u.id = a.staff_user_id
WHERE a.staff_user_id IS NOT NULL AND u.id IS NULL

UNION ALL
SELECT 'appointment_status_history.appointment_id -> appointments.id', COUNT(*)
FROM appointment_status_history ash
LEFT JOIN appointments a ON a.id = ash.appointment_id
WHERE a.id IS NULL

UNION ALL
SELECT 'appointment_status_history.changed_by_user_id -> users.id', COUNT(*)
FROM appointment_status_history ash
LEFT JOIN users u ON u.id = ash.changed_by_user_id
WHERE ash.changed_by_user_id IS NOT NULL AND u.id IS NULL

UNION ALL
SELECT 'services.business_id -> businesses.id', COUNT(*)
FROM services s
LEFT JOIN businesses b ON b.id = s.business_id
WHERE b.id IS NULL

UNION ALL
SELECT 'staff_services.staff_user_id -> users.id', COUNT(*)
FROM staff_services ss
LEFT JOIN users u ON u.id = ss.staff_user_id
WHERE u.id IS NULL

UNION ALL
SELECT 'staff_services.service_id -> services.id', COUNT(*)
FROM staff_services ss
LEFT JOIN services s ON s.id = ss.service_id
WHERE s.id IS NULL

UNION ALL
SELECT 'staff_services.business_id -> businesses.id', COUNT(*)
FROM staff_services ss
LEFT JOIN businesses b ON b.id = ss.business_id
WHERE b.id IS NULL;

-- ---------------------------------------------------------------------
-- 2) Business daily analytics backfill verification
-- Compare snapshot rows to source facts for the configured window.
-- ---------------------------------------------------------------------
WITH params AS (
    SELECT
        (CURRENT_DATE - INTERVAL '30 days')::date AS start_date,
        CURRENT_DATE::date AS end_date
),
source_business AS (
    SELECT
        s.business_id,
        (s.awarded_at AT TIME ZONE 'UTC')::date AS date,
        COUNT(*)::int AS stamps,
        COUNT(DISTINCT c.customer_id)::int AS distinct_customers,
        COUNT(DISTINCT CASE
            WHEN c.created_at >= ((s.awarded_at AT TIME ZONE 'UTC')::date)::timestamp
             AND c.created_at < (((s.awarded_at AT TIME ZONE 'UTC')::date + 1)::date)::timestamp
            THEN c.customer_id
        END)::int AS new_enrollments
    FROM stamps s
    JOIN loyalty_cards c ON c.id = s.card_id
    JOIN params p ON (s.awarded_at AT TIME ZONE 'UTC')::date BETWEEN p.start_date AND p.end_date
    GROUP BY s.business_id, (s.awarded_at AT TIME ZONE 'UTC')::date
),
source_redemptions AS (
    SELECT
        r.business_id,
        (r.redeemed_at AT TIME ZONE 'UTC')::date AS date,
        COUNT(*)::int AS redemptions,
        COALESCE(SUM(r.reward_value), 0)::numeric(12,2) AS payout_kes
    FROM redemptions r
    JOIN params p ON (r.redeemed_at AT TIME ZONE 'UTC')::date BETWEEN p.start_date AND p.end_date
    GROUP BY r.business_id, (r.redeemed_at AT TIME ZONE 'UTC')::date
),
snapshot AS (
    SELECT
        bda.business_id,
        bda.date,
        bda.stamps,
        bda.distinct_customers,
        bda.new_enrollments,
        bda.redemptions,
        bda.payout_kes
    FROM business_daily_analytics bda
    JOIN params p ON bda.date BETWEEN p.start_date AND p.end_date
)
SELECT
    COALESCE(sb.business_id, sr.business_id, ss.business_id) AS business_id,
    COALESCE(sb.date, sr.date, ss.date) AS date,
    COALESCE(sb.stamps, 0) AS source_stamps,
    COALESCE(ss.stamps, 0) AS snapshot_stamps,
    COALESCE(sb.distinct_customers, 0) AS source_distinct_customers,
    COALESCE(ss.distinct_customers, 0) AS snapshot_distinct_customers,
    COALESCE(sb.new_enrollments, 0) AS source_new_enrollments,
    COALESCE(ss.new_enrollments, 0) AS snapshot_new_enrollments,
    COALESCE(sr.redemptions, 0) AS source_redemptions,
    COALESCE(ss.redemptions, 0) AS snapshot_redemptions,
    COALESCE(sr.payout_kes, 0)::numeric(12,2) AS source_payout_kes,
    COALESCE(ss.payout_kes, 0)::numeric(12,2) AS snapshot_payout_kes
FROM source_business sb
FULL OUTER JOIN source_redemptions sr
    ON sr.business_id = sb.business_id AND sr.date = sb.date
FULL OUTER JOIN snapshot ss
    ON ss.business_id = COALESCE(sb.business_id, sr.business_id)
   AND ss.date = COALESCE(sb.date, sr.date)
WHERE COALESCE(sb.stamps, 0) <> COALESCE(ss.stamps, 0)
   OR COALESCE(sb.distinct_customers, 0) <> COALESCE(ss.distinct_customers, 0)
   OR COALESCE(sb.new_enrollments, 0) <> COALESCE(ss.new_enrollments, 0)
   OR COALESCE(sr.redemptions, 0) <> COALESCE(ss.redemptions, 0)
   OR COALESCE(sr.payout_kes, 0)::numeric(12,2) <> COALESCE(ss.payout_kes, 0)::numeric(12,2)
ORDER BY date DESC, business_id;

-- ---------------------------------------------------------------------
-- 3) Staff daily analytics backfill verification
-- ---------------------------------------------------------------------
WITH params AS (
    SELECT
        (CURRENT_DATE - INTERVAL '30 days')::date AS start_date,
        CURRENT_DATE::date AS end_date
),
source_staff AS (
    SELECT
        s.awarded_by_id AS staff_user_id,
        s.business_id,
        (s.awarded_at AT TIME ZONE 'UTC')::date AS date,
        COUNT(*)::int AS stamps,
        COUNT(DISTINCT c.customer_id)::int AS distinct_customers,
        COUNT(DISTINCT CASE
            WHEN c.created_at >= ((s.awarded_at AT TIME ZONE 'UTC')::date)::timestamp
             AND c.created_at < (((s.awarded_at AT TIME ZONE 'UTC')::date + 1)::date)::timestamp
            THEN c.customer_id
        END)::int AS new_customers,
        SUM(CASE WHEN c.total_stamps >= lp.stamps_required THEN 1 ELSE 0 END)::int AS reward_ready_created
    FROM stamps s
    JOIN loyalty_cards c ON c.id = s.card_id
    JOIN loyalty_programs lp ON lp.id = c.program_id
    JOIN params p ON (s.awarded_at AT TIME ZONE 'UTC')::date BETWEEN p.start_date AND p.end_date
    GROUP BY s.awarded_by_id, s.business_id, (s.awarded_at AT TIME ZONE 'UTC')::date
),
snapshot_staff AS (
    SELECT
        sda.staff_user_id,
        sda.business_id,
        sda.date,
        sda.stamps,
        sda.distinct_customers,
        sda.new_customers,
        sda.reward_ready_created
    FROM staff_daily_analytics sda
    JOIN params p ON sda.date BETWEEN p.start_date AND p.end_date
)
SELECT
    COALESCE(src.staff_user_id, snap.staff_user_id) AS staff_user_id,
    COALESCE(src.business_id, snap.business_id) AS business_id,
    COALESCE(src.date, snap.date) AS date,
    COALESCE(src.stamps, 0) AS source_stamps,
    COALESCE(snap.stamps, 0) AS snapshot_stamps,
    COALESCE(src.distinct_customers, 0) AS source_distinct_customers,
    COALESCE(snap.distinct_customers, 0) AS snapshot_distinct_customers,
    COALESCE(src.new_customers, 0) AS source_new_customers,
    COALESCE(snap.new_customers, 0) AS snapshot_new_customers,
    COALESCE(src.reward_ready_created, 0) AS source_reward_ready_created,
    COALESCE(snap.reward_ready_created, 0) AS snapshot_reward_ready_created
FROM source_staff src
FULL OUTER JOIN snapshot_staff snap
    ON snap.staff_user_id = src.staff_user_id
   AND snap.business_id = src.business_id
   AND snap.date = src.date
WHERE COALESCE(src.stamps, 0) <> COALESCE(snap.stamps, 0)
   OR COALESCE(src.distinct_customers, 0) <> COALESCE(snap.distinct_customers, 0)
   OR COALESCE(src.new_customers, 0) <> COALESCE(snap.new_customers, 0)
   OR COALESCE(src.reward_ready_created, 0) <> COALESCE(snap.reward_ready_created, 0)
ORDER BY date DESC, business_id, staff_user_id;

-- ---------------------------------------------------------------------
-- 4) Quick dashboard summary of anomalies
-- ---------------------------------------------------------------------
WITH orphan_checks AS (
    SELECT COUNT(*) AS orphans
    FROM (
        SELECT 1 FROM business_daily_analytics bda LEFT JOIN businesses b ON b.id = bda.business_id WHERE b.id IS NULL
        UNION ALL
        SELECT 1 FROM staff_daily_analytics sda LEFT JOIN users u ON u.id = sda.staff_user_id WHERE u.id IS NULL
        UNION ALL
        SELECT 1 FROM staff_daily_analytics sda LEFT JOIN businesses b ON b.id = sda.business_id WHERE b.id IS NULL
    ) q
)
SELECT
    orphans,
    CASE WHEN orphans = 0 THEN 'PASS' ELSE 'FAIL' END AS fk_integrity_status
FROM orphan_checks;
