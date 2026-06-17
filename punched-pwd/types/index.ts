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
  ownerId?: string;
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
  createdAt: string;
}

export interface CreateLoyaltyProgramRequest {
  name: string;
  stampsRequired: number;
  rewardValue: number;
  rewardDescription: string;
}

export interface UpdateLoyaltyProgramRequest {
  name?: string;
  isActive?: boolean;
  stampsRequired?: number;
  rewardValue?: number;
  rewardDescription?: string;
}

export interface UpsertLoyaltyProgramRequest {
  stampsRequired: number;
  rewardValue: number;
  rewardDescription: string;
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
}

export interface StaffActivityItem {
  customerName: string;
  stampNumber: number;
  stampedAt: string;
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

export interface ProgramPerformanceItem {
  programId: string;
  programName: string;
  totalRedemptions: number;
  activeCards: number;
  completionRate: number;
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
}
