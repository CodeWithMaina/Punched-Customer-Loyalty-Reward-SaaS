CREATE TABLE qr_tokens (
    id uuid NOT NULL,
    customer_id uuid NOT NULL,
    business_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean NOT NULL DEFAULT FALSE,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_qr_tokens" PRIMARY KEY (id)
);


CREATE TABLE user_auth (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_verified boolean NOT NULL DEFAULT FALSE,
    failed_login_attempts smallint NOT NULL DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    verification_code character varying(255),
    verification_code_expires_at timestamp with time zone,
    verification_code_attempts smallint NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_user_auth" PRIMARY KEY (id),
    CONSTRAINT "AK_user_auth_email" UNIQUE (email)
);


CREATE TABLE refresh_tokens (
    id uuid NOT NULL,
    user_auth_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean NOT NULL DEFAULT FALSE,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_refresh_tokens" PRIMARY KEY (id),
    CONSTRAINT "FK_refresh_tokens_user_auth_user_auth_id" FOREIGN KEY (user_auth_id) REFERENCES user_auth (id) ON DELETE CASCADE
);


CREATE TABLE users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    phone_number character varying(20),
    full_name character varying(100) NOT NULL,
    avatar_url character varying(500),
    "DateOfBirth" date,
    "Gender" character varying(50),
    "Role" integer NOT NULL,
    source_provider character varying(30),
    source_campaign character varying(100),
    "StaffBusinessId" uuid,
    daily_goal_override integer,
    is_deleted boolean NOT NULL DEFAULT FALSE,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_users" PRIMARY KEY (id),
    CONSTRAINT "FK_users_user_auth_email" FOREIGN KEY (email) REFERENCES user_auth (email) ON DELETE CASCADE
);


CREATE TABLE businesses (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    location character varying(100) NOT NULL,
    phone_number character varying(20),
    email character varying(255),
    description character varying(500),
    logo_url character varying(500),
    mpesa_number character varying(20) NOT NULL,
    owner_id uuid,
    is_deleted boolean NOT NULL DEFAULT FALSE,
    deleted_at timestamp with time zone,
    default_daily_goal integer,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_businesses" PRIMARY KEY (id),
    CONSTRAINT "FK_businesses_users_owner_id" FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE api_event_logs (
    id uuid NOT NULL,
    tenant_id uuid,
    user_id uuid,
    endpoint character varying(300) NOT NULL,
    method character varying(10) NOT NULL,
    status_code integer NOT NULL,
    duration_ms integer NOT NULL,
    error_code character varying(100),
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_api_event_logs" PRIMARY KEY (id),
    CONSTRAINT "FK_api_event_logs_businesses_tenant_id" FOREIGN KEY (tenant_id) REFERENCES businesses (id) ON DELETE SET NULL,
    CONSTRAINT "FK_api_event_logs_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE appointments (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    staff_user_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_appointments" PRIMARY KEY (id),
    CONSTRAINT "FK_appointments_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_appointments_users_customer_id" FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_appointments_users_staff_user_id" FOREIGN KEY (staff_user_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE business_daily_analytics (
    business_id uuid NOT NULL,
    date date NOT NULL,
    stamps integer NOT NULL,
    distinct_customers integer NOT NULL,
    new_enrollments integer NOT NULL,
    redemptions integer NOT NULL,
    payout_kes numeric(12,2) NOT NULL,
    accrued_liability_kes numeric(12,2) NOT NULL,
    reward_ready_customers integer NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_business_daily_analytics" PRIMARY KEY (business_id, date),
    CONSTRAINT "FK_business_daily_analytics_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT
);


CREATE TABLE customer_segments (
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    segment character varying(30) NOT NULL,
    score integer NOT NULL,
    computed_at timestamp with time zone NOT NULL,
    last_stamp_at timestamp with time zone,
    CONSTRAINT "PK_customer_segments" PRIMARY KEY (business_id, customer_id),
    CONSTRAINT chk_customer_segment_score CHECK ("score" >= 0 AND "score" <= 100),
    CONSTRAINT "FK_customer_segments_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_customer_segments_users_customer_id" FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE insights (
    id uuid NOT NULL,
    audience character varying(20) NOT NULL,
    business_id uuid,
    category character varying(80) NOT NULL,
    metric character varying(80) NOT NULL,
    severity character varying(10) NOT NULL,
    confidence character varying(10) NOT NULL,
    title character varying(160) NOT NULL,
    message character varying(1000) NOT NULL,
    recommendation character varying(1000) NOT NULL,
    data_json jsonb NOT NULL,
    generated_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    dismissed boolean NOT NULL,
    dismissed_at timestamp with time zone,
    dismissed_by uuid,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_insights" PRIMARY KEY (id),
    CONSTRAINT "FK_insights_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL,
    CONSTRAINT "FK_insights_users_dismissed_by" FOREIGN KEY (dismissed_by) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE loyalty_programs (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    name character varying(100) NOT NULL DEFAULT 'Loyalty Program',
    is_active boolean NOT NULL DEFAULT TRUE,
    stamps_required integer NOT NULL,
    reward_value numeric(10,2) NOT NULL,
    reward_description character varying(200) NOT NULL,
    reward_expiration_hours integer NOT NULL,
    default_enrollment_stamps integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_loyalty_programs" PRIMARY KEY (id),
    CONSTRAINT chk_program_reward_value_positive CHECK ("reward_value" > 0),
    CONSTRAINT chk_stamps_required_positive CHECK ("stamps_required" > 0),
    CONSTRAINT "FK_loyalty_programs_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
);


CREATE TABLE notification_inbox (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    type character varying(50) NOT NULL,
    stamps_count integer NOT NULL,
    is_read boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_notification_inbox" PRIMARY KEY (id),
    CONSTRAINT "FK_notification_inbox_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL,
    CONSTRAINT "FK_notification_inbox_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    channel character varying(20) NOT NULL,
    template_type character varying(100) NOT NULL,
    status character varying(20) NOT NULL,
    sent_at timestamp with time zone NOT NULL,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    error character varying(500),
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_notifications" PRIMARY KEY (id),
    CONSTRAINT "FK_notifications_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL,
    CONSTRAINT "FK_notifications_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE referral_links (
    id uuid NOT NULL,
    referrer_id uuid NOT NULL,
    business_id uuid NOT NULL,
    code character varying(12) NOT NULL,
    successful_referrals integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_referral_links" PRIMARY KEY (id),
    CONSTRAINT chk_successful_referrals_gte_zero CHECK ("successful_referrals" >= 0),
    CONSTRAINT "FK_referral_links_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT "FK_referral_links_users_referrer_id" FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE CASCADE
);


CREATE TABLE referral_programs (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    referrals_required integer NOT NULL DEFAULT 1,
    reward_type character varying(20) NOT NULL,
    reward_value numeric NOT NULL,
    reward_description character varying(200) NOT NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    expiration_days integer NOT NULL DEFAULT 30,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_referral_programs" PRIMARY KEY (id),
    CONSTRAINT chk_expiration_days_gte_one CHECK ("expiration_days" >= 1),
    CONSTRAINT chk_referral_reward_value_gte_zero CHECK ("reward_value" >= 0),
    CONSTRAINT chk_referrals_required_gte_one CHECK ("referrals_required" >= 1),
    CONSTRAINT "FK_referral_programs_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
);


CREATE TABLE reviews (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    staff_user_id uuid,
    rating integer NOT NULL,
    comment character varying(500),
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_reviews" PRIMARY KEY (id),
    CONSTRAINT chk_review_rating CHECK ("rating" >= 1 AND "rating" <= 5),
    CONSTRAINT "FK_reviews_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_reviews_users_customer_id" FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_reviews_users_staff_user_id" FOREIGN KEY (staff_user_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE services (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    duration_minutes integer NOT NULL,
    price numeric(10,2),
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_services" PRIMARY KEY (id),
    CONSTRAINT "FK_services_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT
);


CREATE TABLE staff_daily_analytics (
    staff_user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    date date NOT NULL,
    stamps integer NOT NULL,
    distinct_customers integer NOT NULL,
    new_customers integer NOT NULL,
    reward_ready_created integer NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_staff_daily_analytics" PRIMARY KEY (staff_user_id, business_id, date),
    CONSTRAINT "FK_staff_daily_analytics_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_staff_daily_analytics_users_staff_user_id" FOREIGN KEY (staff_user_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE staff_invitations (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    invited_email character varying(255) NOT NULL,
    inviting_user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    status integer NOT NULL DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    resend_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_staff_invitations" PRIMARY KEY (id),
    CONSTRAINT "FK_staff_invitations_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_staff_invitations_users_inviting_user_id" FOREIGN KEY (inviting_user_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE staff_shifts (
    id uuid NOT NULL,
    staff_user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    date date NOT NULL,
    start_hour integer NOT NULL,
    end_hour integer NOT NULL,
    is_working boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_staff_shifts" PRIMARY KEY (id),
    CONSTRAINT chk_staff_shift_end_hour CHECK ("end_hour" >= 0 AND "end_hour" <= 23),
    CONSTRAINT chk_staff_shift_start_hour CHECK ("start_hour" >= 0 AND "start_hour" <= 23),
    CONSTRAINT "FK_staff_shifts_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_staff_shifts_users_staff_user_id" FOREIGN KEY (staff_user_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE appointment_resources (
    id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    service_catalog_item_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_appointment_resources" PRIMARY KEY (id),
    CONSTRAINT "FK_appointment_resources_appointments_appointment_id" FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
);


CREATE TABLE appointment_status_history (
    id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    changed_at timestamp with time zone NOT NULL,
    changed_by_user_id uuid,
    note character varying(300),
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_appointment_status_history" PRIMARY KEY (id),
    CONSTRAINT "FK_appointment_status_history_appointments_appointment_id" FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
    CONSTRAINT "FK_appointment_status_history_users_changed_by_user_id" FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE loyalty_cards (
    id uuid NOT NULL,
    customer_id uuid NOT NULL,
    business_id uuid NOT NULL,
    program_id uuid NOT NULL,
    total_stamps integer NOT NULL DEFAULT 0,
    lifetime_stamps integer NOT NULL DEFAULT 0,
    total_redemptions integer NOT NULL DEFAULT 0,
    last_stamp_at timestamp with time zone,
    enrolled_at timestamp with time zone NOT NULL,
    "RewardExpiresAt" timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_loyalty_cards" PRIMARY KEY (id),
    CONSTRAINT chk_lifetime_gte_total CHECK ("lifetime_stamps" >= "total_stamps"),
    CONSTRAINT chk_lifetime_stamps_gte_zero CHECK ("lifetime_stamps" >= 0),
    CONSTRAINT chk_total_stamps_gte_zero CHECK ("total_stamps" >= 0),
    CONSTRAINT "FK_loyalty_cards_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT "FK_loyalty_cards_loyalty_programs_program_id" FOREIGN KEY (program_id) REFERENCES loyalty_programs (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_loyalty_cards_users_customer_id" FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE
);


CREATE TABLE loyalty_program_history (
    id uuid NOT NULL,
    loyalty_program_id uuid NOT NULL,
    stamps_required integer NOT NULL,
    reward_value numeric(10,2) NOT NULL,
    reward_description character varying(200) NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    changed_by_user_id uuid,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_loyalty_program_history" PRIMARY KEY (id),
    CONSTRAINT "FK_loyalty_program_history_loyalty_programs_loyalty_program_id" FOREIGN KEY (loyalty_program_id) REFERENCES loyalty_programs (id) ON DELETE CASCADE,
    CONSTRAINT "FK_loyalty_program_history_users_changed_by_user_id" FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE referrals (
    id uuid NOT NULL,
    referral_link_id uuid NOT NULL,
    referrer_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    business_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    activated_at timestamp with time zone,
    qualified_at timestamp with time zone,
    rewarded_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_referrals" PRIMARY KEY (id),
    CONSTRAINT "FK_referrals_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT "FK_referrals_referral_links_referral_link_id" FOREIGN KEY (referral_link_id) REFERENCES referral_links (id) ON DELETE CASCADE,
    CONSTRAINT "FK_referrals_users_referee_id" FOREIGN KEY (referee_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_referrals_users_referrer_id" FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE staff_services (
    id uuid NOT NULL,
    staff_user_id uuid NOT NULL,
    service_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_staff_services" PRIMARY KEY (id),
    CONSTRAINT "FK_staff_services_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_staff_services_services_service_id" FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
    CONSTRAINT "FK_staff_services_users_staff_user_id" FOREIGN KEY (staff_user_id) REFERENCES users (id) ON DELETE RESTRICT
);


CREATE TABLE redemptions (
    id uuid NOT NULL,
    card_id uuid NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid,
    performed_by_role character varying(20),
    reward_value numeric(10,2) NOT NULL,
    status character varying(50) NOT NULL DEFAULT 'pending',
    mpesa_ref character varying(100),
    redeemed_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    processing_started_at timestamp with time zone,
    retry_count integer NOT NULL DEFAULT 0,
    next_retry_at timestamp with time zone,
    processing_worker_id character varying(100),
    failure_reason character varying(500),
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_redemptions" PRIMARY KEY (id),
    CONSTRAINT chk_redemption_reward_value_positive CHECK ("reward_value" > 0),
    CONSTRAINT "FK_redemptions_businesses_business_id" FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_redemptions_loyalty_cards_card_id" FOREIGN KEY (card_id) REFERENCES loyalty_cards (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_redemptions_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE stamps (
    id uuid NOT NULL,
    card_id uuid NOT NULL,
    stamp_number smallint NOT NULL,
    stamped_at timestamp with time zone NOT NULL,
    qr_token_id uuid,
    awarded_by_user_id uuid,
    source character varying(20),
    "BusinessId" uuid,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_stamps" PRIMARY KEY (id),
    CONSTRAINT chk_stamp_number_positive CHECK ("stamp_number" > 0),
    CONSTRAINT "FK_stamps_businesses_BusinessId" FOREIGN KEY ("BusinessId") REFERENCES businesses (id),
    CONSTRAINT "FK_stamps_loyalty_cards_card_id" FOREIGN KEY (card_id) REFERENCES loyalty_cards (id) ON DELETE RESTRICT
);


CREATE INDEX "IX_api_event_logs_created_at" ON api_event_logs (created_at DESC);


CREATE INDEX "IX_api_event_logs_status_code" ON api_event_logs (status_code);


CREATE INDEX "IX_api_event_logs_tenant_id_created_at" ON api_event_logs (tenant_id, created_at);


CREATE INDEX "IX_api_event_logs_user_id" ON api_event_logs (user_id);


CREATE INDEX "IX_appointment_resources_appointment_id" ON appointment_resources (appointment_id);


CREATE INDEX "IX_appointment_resources_service_catalog_item_id" ON appointment_resources (service_catalog_item_id);


CREATE INDEX "IX_appointment_status_history_appointment_id_changed_at" ON appointment_status_history (appointment_id, changed_at);


CREATE INDEX "IX_appointment_status_history_changed_by_user_id" ON appointment_status_history (changed_by_user_id);


CREATE INDEX "IX_appointments_business_id_scheduled_at" ON appointments (business_id, scheduled_at);


CREATE INDEX "IX_appointments_customer_id" ON appointments (customer_id);


CREATE INDEX "IX_appointments_staff_user_id_scheduled_at" ON appointments (staff_user_id, scheduled_at);


CREATE INDEX "IX_business_daily_analytics_business_id_date" ON business_daily_analytics (business_id, date DESC);


CREATE INDEX "IX_businesses_category" ON businesses (category);


CREATE INDEX "IX_businesses_name_location" ON businesses (name, location);


CREATE INDEX "IX_businesses_owner_id" ON businesses (owner_id);


CREATE INDEX "IX_businesses_owner_id_is_deleted" ON businesses (owner_id, is_deleted);


CREATE INDEX "IX_customer_segments_business_id_customer_id" ON customer_segments (business_id, customer_id);


CREATE INDEX "IX_customer_segments_business_id_segment" ON customer_segments (business_id, segment);


CREATE INDEX "IX_customer_segments_customer_id" ON customer_segments (customer_id);


CREATE INDEX "IX_insights_audience_business_id_generated_at" ON insights (audience, business_id, generated_at);


CREATE INDEX "IX_insights_business_id_dismissed_severity" ON insights (business_id, dismissed, severity);


CREATE INDEX "IX_insights_dismissed_by" ON insights (dismissed_by);


CREATE INDEX "IX_loyalty_cards_business_id_enrolled_at" ON loyalty_cards (business_id, enrolled_at);


CREATE INDEX "IX_loyalty_cards_business_id_last_stamp_at" ON loyalty_cards (business_id, last_stamp_at);


CREATE INDEX "IX_loyalty_cards_business_id_program_id" ON loyalty_cards (business_id, program_id);


CREATE INDEX "IX_loyalty_cards_customer_id" ON loyalty_cards (customer_id);


CREATE UNIQUE INDEX "IX_loyalty_cards_customer_id_business_id" ON loyalty_cards (customer_id, business_id);


CREATE INDEX "IX_loyalty_cards_program_id" ON loyalty_cards (program_id);


CREATE INDEX "IX_loyalty_program_history_changed_by_user_id" ON loyalty_program_history (changed_by_user_id);


CREATE INDEX "IX_loyalty_program_history_loyalty_program_id_effective_from" ON loyalty_program_history (loyalty_program_id, effective_from);


CREATE INDEX "IX_loyalty_programs_business_id" ON loyalty_programs (business_id);


CREATE INDEX "IX_notification_inbox_business_id" ON notification_inbox (business_id);


CREATE INDEX "IX_notification_inbox_user_id_created_at" ON notification_inbox (user_id, created_at);


CREATE INDEX "IX_notification_inbox_user_id_is_read" ON notification_inbox (user_id, is_read);


CREATE INDEX "IX_notifications_business_id_template_type" ON notifications (business_id, template_type);


CREATE INDEX "IX_notifications_status_sent_at" ON notifications (status, sent_at);


CREATE INDEX "IX_notifications_user_id_sent_at" ON notifications (user_id, sent_at);


CREATE INDEX "IX_qr_tokens_customer_id_business_id" ON qr_tokens (customer_id, business_id);


CREATE INDEX "IX_qr_tokens_expires_at" ON qr_tokens (expires_at);


CREATE UNIQUE INDEX "IX_qr_tokens_token_hash" ON qr_tokens (token_hash);


CREATE INDEX "IX_redemptions_business_id_redeemed_at" ON redemptions (business_id, redeemed_at);


CREATE INDEX "IX_redemptions_business_id_user_id_redeemed_at" ON redemptions (business_id, user_id, redeemed_at);


CREATE INDEX "IX_redemptions_card_id_redeemed_at" ON redemptions (card_id, redeemed_at);


CREATE INDEX "IX_redemptions_status" ON redemptions (status);


CREATE INDEX "IX_redemptions_status_next_retry_at" ON redemptions (status, next_retry_at);


CREATE INDEX "IX_redemptions_UserId" ON redemptions (user_id);


CREATE INDEX "IX_referral_links_business_id" ON referral_links (business_id);


CREATE UNIQUE INDEX "IX_referral_links_code" ON referral_links (code);


CREATE INDEX "IX_referral_links_referrer_id" ON referral_links (referrer_id);


CREATE UNIQUE INDEX "IX_referral_links_referrer_id_business_id" ON referral_links (referrer_id, business_id);


CREATE UNIQUE INDEX "IX_referral_programs_business_id" ON referral_programs (business_id);


CREATE INDEX "IX_referrals_business_id_status" ON referrals (business_id, status);


CREATE INDEX "IX_referrals_expires_at" ON referrals (expires_at);


CREATE INDEX "IX_referrals_referee_id" ON referrals (referee_id);


CREATE UNIQUE INDEX "IX_referrals_referee_id_business_id" ON referrals (referee_id, business_id) WHERE "status" NOT IN ('Expired');


CREATE INDEX "IX_referrals_referral_link_id" ON referrals (referral_link_id);


CREATE INDEX "IX_referrals_referrer_id" ON referrals (referrer_id);


CREATE INDEX "IX_refresh_tokens_expires_at" ON refresh_tokens (expires_at);


CREATE UNIQUE INDEX "IX_refresh_tokens_token" ON refresh_tokens (token);


CREATE INDEX "IX_refresh_tokens_user_auth_id" ON refresh_tokens (user_auth_id);


CREATE INDEX "IX_reviews_business_id_created_at" ON reviews (business_id, created_at);


CREATE INDEX "IX_reviews_customer_id" ON reviews (customer_id);


CREATE INDEX "IX_reviews_staff_user_id_created_at" ON reviews (staff_user_id, created_at);


CREATE INDEX "IX_services_business_id_is_active" ON services (business_id, is_active);


CREATE INDEX "IX_staff_daily_analytics_business_id_date" ON staff_daily_analytics (business_id, date);


CREATE INDEX "IX_staff_daily_analytics_staff_user_id_date" ON staff_daily_analytics (staff_user_id, date);


CREATE UNIQUE INDEX ix_staff_invitations_business_email_pending ON staff_invitations (business_id, invited_email) WHERE "status" = 0;


CREATE INDEX ix_staff_invitations_business_id ON staff_invitations (business_id);


CREATE INDEX "IX_staff_invitations_inviting_user_id" ON staff_invitations (inviting_user_id);


CREATE UNIQUE INDEX ix_staff_invitations_token_hash ON staff_invitations (token_hash);


CREATE INDEX "IX_staff_services_business_id_service_id" ON staff_services (business_id, service_id);


CREATE INDEX "IX_staff_services_service_id" ON staff_services (service_id);


CREATE INDEX "IX_staff_services_staff_user_id_business_id" ON staff_services (staff_user_id, business_id);


CREATE INDEX "IX_staff_shifts_business_id_date" ON staff_shifts (business_id, date);


CREATE INDEX "IX_staff_shifts_staff_user_id_date" ON staff_shifts (staff_user_id, date);


CREATE INDEX "IX_stamps_awarded_by_user_id_stamped_at" ON stamps (awarded_by_user_id, stamped_at);


CREATE INDEX "IX_stamps_BusinessId" ON stamps ("BusinessId");


CREATE INDEX "IX_stamps_card_id" ON stamps (card_id);


CREATE INDEX "IX_stamps_card_id_stamped_at" ON stamps (card_id, stamped_at);


CREATE UNIQUE INDEX "IX_stamps_qr_token_id" ON stamps (qr_token_id);


CREATE INDEX "IX_user_auth_created_at" ON user_auth (created_at);


CREATE UNIQUE INDEX "IX_user_auth_email" ON user_auth (email);


CREATE UNIQUE INDEX "IX_users_email" ON users (email);


CREATE INDEX "IX_users_full_name_email" ON users (full_name, email);


CREATE INDEX "IX_users_is_deleted" ON users (is_deleted);


CREATE INDEX "IX_users_StaffBusinessId" ON users ("StaffBusinessId");


