// ═══════════════════════════════════════════════════════════════
//  Punched API TypeScript Types
//  Matches API response/request contracts from 04_API_ENDPOINTS.md
// ═══════════════════════════════════════════════════════════════

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

/** Error payload in failed responses */
export interface ApiError {
  code: string;
  message: string;
}

/** User roles matching the API enum */
export type UserRole = "Customer" | "Business" | "Staff" | "Admin";

/** User profile */
export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  role: UserRole;
  createdAt: string;
}

/** Auth tokens + user profile (login/verify response) */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

/** Token-only response (refresh) */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Simple message response */
export interface MessageResponse {
  message: string;
}

// -- Auth request types -----------------------------------------------

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RequestEmailRequest {
  email: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
}

// -- Business types ---------------------------------------------------

export interface Business {
  id: string;
  name: string;
  category: string;
  location: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  mpesaNumber?: string;
  ownerId?: string;
  defaultDailyGoal?: number;
  loyaltyProgram?: LoyaltyProgram;
  loyaltyPrograms: LoyaltyProgram[];
  hasReferralProgram: boolean;
  createdAt: string;
}

export interface CreateBusinessRequest {
  name: string;
  category: string;
  location: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  mpesaNumber: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  category?: string;
  location?: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  mpesaNumber?: string;
}

// -- Loyalty program types --------------------------------------------

export interface LoyaltyProgram {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  stampsRequired: number;
  rewardValue: number;
  rewardDescription: string;
  rewardExpirationHours: number;
  defaultEnrollmentStamps: number;
  createdAt: string;
}

export interface CreateLoyaltyProgramRequest {
  name: string;
  stampsRequired: number;
  rewardValue: number;
  rewardDescription: string;
  defaultEnrollmentStamps: number;
}

export interface UpdateLoyaltyProgramRequest {
  name?: string;
  isActive?: boolean;
  stampsRequired?: number;
  rewardValue?: number;
  rewardDescription?: string;
  defaultEnrollmentStamps?: number;
}

export interface UpsertLoyaltyProgramRequest {
  stampsRequired: number;
  rewardValue: number;
  rewardDescription: string;
  defaultEnrollmentStamps: number;
}

// -- Loyalty card types -----------------------------------------------

export interface LoyaltyCard {
  id: string;
  customerId: string;
  businessId: string;
  businessName: string;
  businessLogoUrl?: string;
  programId: string;
  totalStamps: number;
  lifetimeStamps: number;
  totalRedemptions: number;
  lastStampAt?: string;
  enrolledAt: string;
  rewardExpiresAt?: string;
  program: LoyaltyProgram;
}

export interface EnrollCardRequest {
  businessId: string;
}

// -- QR token types ---------------------------------------------------

export interface QrTokenResponse {
  token: string;
  expiresAt: string;
  businessId: string;
}

export interface GenerateQrRequest {
  businessId: string;
}

// -- Stamp types ------------------------------------------------------

export interface AwardStampRequest {
  token: string;
  businessId: string;
}

export interface StampAwardedResponse {
  cardId: string;
  customerId: string;
  customerName: string;
  stampNumber: number;
  totalStamps: number;
  stampsRequired: number;
  rewardReady: boolean;
  rewardDescription?: string;
  stampedAt: string;
}

/** SSE event payload received over the stamp stream */
export interface SseStampEvent {
  event: string;
  cardId: string;
  stampNumber: number;
  totalStamps: number;
  stampsRequired: number;
  rewardReady: boolean;
  stampedAt: string;
}

// -- Business customer management ------------------------------------

export interface BusinessCustomer {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  cardId: string;
  totalStamps: number;
  lifetimeStamps: number;
  totalRedemptions: number;
  enrolledAt: string;
  lastStampAt?: string;
  /** Effective reward threshold for this business's loyalty program. */
  stampsRequired?: number | null;
}

/** Customer management overview (owner view). */
export interface CustomerOverviewResponse {
  totalCustomers: number;
  /** Customers with at least one stamp in the trailing 7 days. */
  active7d: number;
  /** Customers whose current cycle reached the reward threshold. */
  rewardReady: number;
  /** Customers enrolled within the trailing 7 days. */
  newThisWeek: number;
  /** Customers with no stamp in the last 21 days. */
  atRisk: number;
  stampsThisWeek: number;
  topCustomers: BusinessCustomer[];
  soonToReward: BusinessCustomer[];
  recentlyActive: BusinessCustomer[];
}

/** Single event in a customer's stamp/redemption history. */
export interface CustomerActivityItem {
  activityId: string;
  activityType: "stamp" | "redemption" | string;
  stampNumber?: number;
  rewardValue?: number;
  staffName?: string | null;
  timestamp: string;
}

/** Paginated customer activity feed. */
export interface CustomerActivityFeedResponse {
  customerId: string;
  customerName: string;
  items: CustomerActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// -- Redemption types ------------------------------------------------

export interface ClaimRewardRequest {
  cardId: string;
}

export interface RedemptionResponse {
  id: string;
  cardId: string;
  businessName: string;
  rewardValue: number;
  rewardDescription: string;
  status: string;
  redeemedAt: string;
}

// -- Forgot password types -------------------------------------------

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// -- Referral types ---------------------------------------------------

export type ReferralRewardType = "Stamp" | "Discount" | "FreeItem";
export type ReferralStatusType = "Pending" | "Activated" | "Qualified" | "Rewarded" | "Expired";

export interface ReferralProgram {
  id: string;
  businessId: string;
  referralsRequired: number;
  rewardType: ReferralRewardType;
  rewardValue: number;
  rewardDescription: string;
  isActive: boolean;
  expirationDays: number;
  createdAt: string;
}

export interface UpsertReferralProgramRequest {
  referralsRequired: number;
  rewardType: ReferralRewardType;
  rewardValue: number;
  rewardDescription: string;
  expirationDays: number;
}

export interface ReferralLink {
  id: string;
  referrerId: string;
  businessId: string;
  businessName: string;
  businessLogoUrl?: string;
  code: string;
  referralUrl: string;
  successfulReferrals: number;
  isActive: boolean;
  createdAt: string;
}

export interface GenerateReferralLinkRequest {
  businessId: string;
}

export interface ResolveReferralRequest {
  code: string;
}

export interface ResolveReferralResponse {
  businessId: string;
  businessName: string;
  businessLogoUrl?: string;
  referrerName: string;
  referralId: string;
  enrolled: boolean;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  refereeId: string;
  refereeName: string;
  businessId: string;
  businessName: string;
  status: ReferralStatusType;
  activatedAt?: string;
  qualifiedAt?: string;
  rewardedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  activatedReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  expiredReferrals: number;
  totalRewardsEarned: number;
}

// -- Business dashboard types ----------------------------------------

export interface BusinessDashboardResponse {
  businessId: string;
  businessName: string;
  activeCards: number;
  totalStampsIssued: number;
  stampsToday: number;
  totalRedemptions: number;
  rewardReadyCards: number;
  staffMini?: StaffMini[];
}

/** Lightweight staff summary shown on the owner dashboard "Your team" strip. */
export interface StaffMini {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  stampsToday: number;
  dailyGoal: number;
  isOnShift: boolean;
}

/** Recent stamp entry in the business activity feed. */
export interface StampDto {
  id: string;
  customerName: string;
  rewardDescription?: string;
  timestamp: string;
  source: "scan" | "enrollment" | string;
}

/** In-app notification for staff. */
export interface NotificationDto {
  id: string;
  type: "GoalReached" | "RewardReady" | string;
  businessId?: string;
  stampsCount: number;
  isRead: boolean;
  createdAt: string;
}

// -- Staff types -----------------------------------------------------

export interface StaffBusinessResponse {
  businessId: string;
  businessName: string;
}

export interface StaffMember {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  stampsIssued: number;
  dailyGoalOverride?: number;
  dailyGoal?: number;
  /** Stamps issued today (business-scoped). */
  stampsToday?: number;
  /** Stamps issued in the trailing 7 days (business-scoped). */
  stampsLast7d?: number;
  /** UTC timestamp of the staff member's most recent stamp activity. */
  lastActivityAt?: string | null;
}

/** Paginated staff list envelope. */
export interface StaffListResponse {
  items: StaffMember[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StaffOverviewResponse {
  totalStaff: number;
  activeStaff7d: number;
  inactiveStaff: number;
  pendingInvitations: number;
  stampsToday: number;
  stampsThisWeek: number;
  goalsMetToday: number;
  staffWithGoals: number;
  topPerformers: StaffMember[];
  needsAttention: StaffMember[];
  recentlyActive: StaffMember[];
}

export interface StaffActivityItem {
  activityId?: string;
  activityType?: "stamp" | "scan" | "redemption" | string;
  customerId?: string;
  customerName: string;
  stampNumber: number;
  status?: string;
  rewardValue?: number;
  stampedAt: string;
}

export interface StaffActivitySummary {
  totalScans: number;
  totalStamps: number;
  totalRedemptions: number;
  customersServed: number;
  totalActivities: number;
}

export interface StaffIdentity {
  id: string;
  name: string;
  email: string;
}

export interface StaffActivityFeedResponse {
  staff: StaffIdentity;
  summary: StaffActivitySummary;
  activity: StaffActivityItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface StaffActivityQuery {
  activityType?: "all" | "stamp" | "scan" | "redemption";
  customerId?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export type AnalyticsPeriod = "today" | "7d" | "30d" | "all";

export interface StaffMemberAnalyticsResponse {
  staffId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  period: AnalyticsPeriod;
  stampsIssued: number;
  customersServed: number;
  totalStampsAllTime: number;
  totalCustomersAllTime: number;
  dailyGoal?: number;
  /** Personal override if set (null = using business default). */
  dailyGoalOverride?: number | null;
  recentActivity: StaffActivityItem[];
}

export interface CustomerPeriodStatsResponse {
  period: AnalyticsPeriod;
  stampsInPeriod: number;
  visitsInPeriod: number;
  lastVisitInPeriod?: string;
}

export interface StaffAnalyticsResponse {
  businessId: string;
  businessName: string;
  staffName: string;
  stampsToday: number;
  stampsThisWeek: number;
  stampsThisMonth: number;
  totalStamps: number;
  totalCustomers: number;
  rewardReadyCount: number;
  dailyGoal?: number;
  recentActivity: StaffActivityItem[];
}

// -- Admin types --------------------------------------------------------

export interface AdminDashboardResponse {
  totalCustomers: number;
  totalBusinesses: number;
  totalStaff: number;
  totalStamps: number;
  totalRedemptions: number;
  totalCards: number;
  totalReferrals: number;
  newCustomersToday: number;
  newBusinessesToday: number;
  stampsToday: number;
  redemptionsToday: number;
  newCustomers7d: number;
  newBusinesses7d: number;
  stamps7d: number;
  redemptions7d: number;
}

export interface GrowthDataPoint {
  date: string;
  count: number;
}

export interface AdminGrowthResponse {
  period: string;
  customers: GrowthDataPoint[];
  businesses: GrowthDataPoint[];
  stamps: GrowthDataPoint[];
  redemptions: GrowthDataPoint[];
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  totalStamps: number;
  totalRedemptions: number;
  totalCustomers: number;
}

export interface AdminBusinessSummary {
  id: string;
  name: string;
  category: string;
  location: string;
  ownerName: string;
  ownerEmail: string;
  totalCustomers: number;
  totalStamps: number;
  totalRedemptions: number;
  totalStaff: number;
  programCount: number;
  createdAt: string;
}

export interface AdminBusinessAnalyticsResponse {
  categoryBreakdown: CategoryBreakdown[];
  topBusinesses: AdminBusinessSummary[];
  recentBusinesses: AdminBusinessSummary[];
}

export interface DemographicItem {
  label: string;
  count: number;
}

export interface EngagementBreakdown {
  highlyActive: number;
  active: number;
  occasional: number;
  dormant: number;
}

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  gender?: string;
  totalCards: number;
  lifetimeStamps: number;
  totalRedemptions: number;
  createdAt: string;
}

export interface AdminCustomerAnalyticsResponse {
  genderBreakdown: DemographicItem[];
  ageBreakdown: DemographicItem[];
  topCustomers: AdminCustomerSummary[];
  engagementBreakdown: EngagementBreakdown;
}

export interface AdminStaffSummary {
  id: string;
  fullName: string;
  email: string;
  businessName?: string;
  totalStampsIssued: number;
  customersServed: number;
  createdAt: string;
}

export interface AdminStaffAnalyticsResponse {
  totalStaff: number;
  linkedStaff: number;
  unlinkedStaff: number;
  topStaff: AdminStaffSummary[];
}

export interface SmartInsight {
  type: string;
  title: string;
  description: string;
  metric?: string;
  trend?: string;
}

export interface AdminInsightsResponse {
  insights: SmartInsight[];
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface AdminUpdateUserRequest {
  fullName?: string;
  role?: UserRole;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
}

// -- Business Analytics types (decision-making dashboard) ---------------

export interface HourlyActivityPoint {
  hour: number;
  stamps: number;
  redemptions: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
}

export interface DemographicSlice {
  label: string;
  count: number;
}

export interface EngagementTrendPoint {
  date: string;
  stamps: number;
  redemptions: number;
  enrollments: number;
}

export interface CompletionTrendPoint {
  date: string;
  value: number;
}

export interface ProgramPerformanceItem {
  programId: string;
  programName: string;
  totalRedemptions: number;
  activeCards: number;
  completionRate: number;
  rewardPayoutKes: number;
  rewardsPaidKes: number;
  rewardsPendingKes: number;
  completionTrend: CompletionTrendPoint[];
}

export interface GrowthPoint {
  date: string;
  total: number;
  newCount: number;
}

export interface RetentionSummary {
  newCustomers: number;
  returningCustomers: number;
  dormantCustomers: number;
  retentionRate: number;
}

export interface StaffPerformanceItem {
  staffId: string;
  name: string;
  stampsIssued: number;
  customersServed: number;
  stampsToday: number;
  stampsLast7Days: number;
  stampsLast30Days: number;
  stampsAllTime: number;
  stampsPerActiveDay: number;
  personalBest: number;
}

export interface FunnelData {
  totalCustomers: number;
  stampedAtLeastOnce: number;
  completedCard: number;
  redeemed: number;
}

export interface TopCustomerItem {
  customerId: string;
  name: string;
  lifetimeStamps: number;
  totalRedemptions: number;
  lastVisit?: string;
}

export interface BusinessAnalyticsResponse {
  period: string;
  hourlyActivity: HourlyActivityPoint[];
  weeklyHeatmap: HeatmapCell[];
  genderBreakdown: DemographicSlice[];
  ageBreakdown: DemographicSlice[];
  engagementTrends: EngagementTrendPoint[];
  programPerformance: ProgramPerformanceItem[];
  customerGrowth: GrowthPoint[];
  retentionData: RetentionSummary;
  staffPerformance: StaffPerformanceItem[];
  funnelData: FunnelData;
  topCustomers: TopCustomerItem[];
  overview: ExecutiveOverviewResponse;
  revenue: BusinessRevenueResponse;
  traffic: BusinessTrafficResponse;
    recommendations: BusinessRecommendation[];
}

// ── Extended analytics DTOs (executive / revenue / traffic) ─────────

export interface ExecutiveOverviewResponse {
  totalEnrolledCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  totalStamps: number;
  stampsThisWeek: number;
  avgStampsPerCustomer: number;
  rewardPayoutKes: number;
  redemptionRate: number;
  netEngagementValueKes: number;
  rewardReadyCustomers: number;
  dormantCustomers: number;
  churnedCustomers: number;
}

export interface RewardPayoutPoint {
  date: string;
  value: number;
}

export interface BusinessRevenueResponse {
  rewardPayoutKes: number;
  rewardPayoutTrend: RewardPayoutPoint[];
  accruedLiabilityKes: number;
  payoutSuccessRate: number;
  rewardsEarnedKes: number;
  rewardsPaidKes: number;
  pendingPayoutKes: number;
  avgPayoutLatencyDays?: number | null;
  failedPayouts: number;
}

export interface PeakHourItem {
  hour: number;
  stampCount: number;
}

export interface UnderutilizedHourItem {
  hour: number;
  stampCount: number;
  label: string;
}

export interface BusinessTrafficResponse {
  peakHours: PeakHourItem[];
  busiestDayOfWeek: string | null;
  busiestDayStamps: number;
  underutilizedHours: UnderutilizedHourItem[];
  visitCadenceDays?: number | null;
}

export type RecommendationPriority = "high" | "medium" | "low";

export interface BusinessRecommendation {
  type: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
  action: string;
  actionUrl?: string | null;
  entityId?: string | null;
}

// ── Period-over-period comparison ──────────────────────────────

export interface ComparisonWindowInfo {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export interface MetricComparisonResult {
  metric: string;
  previousValue: number;
  currentValue: number;
  changePct: number | null;
  trend: "up" | "down" | "flat";
}

export interface BusinessComparisonSummary {
  stamps: MetricComparisonResult;
  customers: MetricComparisonResult;
  payoutKes: MetricComparisonResult;
}

export interface BusinessAnalyticsComparisonResponse {
  period: string;
  previousPeriod: string;
  windows: ComparisonWindowInfo | null;
  metrics: MetricComparisonResult[];
  summary: BusinessComparisonSummary;
}

// ── Onboarding & staff invitations ─────────────────────────────

export type InvitationStatus = "Pending" | "Accepted" | "Revoked";

export interface StaffInvitation {
  id: string;
  businessId: string;
  email: string;
  invitedByUserId: string;
  status: InvitationStatus;
  statusLabel: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  resendCount: number;
  isExpired: boolean;
}

export interface CreateStaffInvitationRequest {
  email: string;
}

export interface StaffInvitationValidationResponse {
  valid: boolean;
  businessId: string;
  businessName: string;
  businessLogoUrl?: string | null;
  email: string;
  expiresAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface AcceptStaffInvitationRequest {
  fullName: string;
  password: string;
  emailConfirmation: string;
}

export interface RegisterBusinessRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  businessName: string;
  businessCategory: string;
  businessLocation: string;
  businessPhone?: string;
  businessEmail?: string;
  businessMpesaNumber: string;
  businessDescription?: string;
  logoUrl?: string;
}

export interface RegisterBusinessResponse {
  message: string;
  business?: Business | null;
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING — appointments, service catalog, availability
//  Mirrors backend DTOs (backend.md §8 / AppointmentDTOs.cs).
//  Dates are ISO-UTC strings; ids/GUIDs are strings.
// ═══════════════════════════════════════════════════════════════

/** A service offered by a business (public/owner views). */
export interface ServiceCatalogItemResponse {
  id: string;
  businessId: string;
  name: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

/** Creates a new catalog service. */
export interface CreateServiceRequest {
  name: string;
  durationMinutes: number;
  price: number;
}

/** Partially updates a catalog service (only provided fields applied). */
export interface UpdateServiceRequest {
  name?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

/** A single bookable slot produced by the availability engine. */
export interface AvailabilitySlotResponse {
  startAtUtc: string;
  endAtUtc: string;
  staffUserId: string;
  staffName: string;
  serviceIds: string[];
}

/** Immutable snapshot of a service at booking time. */
export interface AppointmentServiceSnapshot {
  serviceCatalogItemId: string;
  name: string;
  durationMinutes: number;
  price: number;
  sortOrder: number;
}

/** Lowercase appointment lifecycle statuses per backend.md §8. */
export type AppointmentStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/** Full appointment view. */
export interface AppointmentResponse {
  id: string;
  businessId: string;
  customerId: string;
  staffUserId?: string | null;
  scheduledAt: string;
  endAt: string;
  status: AppointmentStatus;
  services: AppointmentServiceSnapshot[];
  createdAt: string;
  updatedAt: string;
}

/** Customer self-service booking. customerId is always forced server-side. */
export interface CreateAppointmentRequest {
  businessId: string;
  serviceIds: string[];
  staffUserId?: string;
  scheduledAt: string;
  note?: string;
}

/** Reschedules an existing appointment; serviceIds/staffUserId optional. */
export interface RescheduleAppointmentRequest {
  scheduledAt: string;
  serviceIds?: string[];
  staffUserId?: string;
  note?: string;
}

/** Cancels an existing appointment. */
export interface CancelAppointmentRequest {
  note?: string;
}

/** Business/Staff booking on behalf of a customer. */
export interface CreateAppointmentOnBehalfRequest {
  businessId: string;
  serviceIds: string[];
  staffUserId?: string;
  scheduledAt: string;
  note?: string;
  customerId: string;
}

/** Wizard booking form model (session-only — never persisted). */
export interface AppointmentFormData {
  businessId: string;
  serviceIds: string[];
  staffUserId?: string;
  scheduledAt: string | null;
  note?: string;
}

