export type AppRoute =
  | "/"
  | "/login"
  | "/signup"
  | "/dashboard"
  | "/scheduler"
  | "/analytics"
  | "/notifications"
  | "/billing"
  | "/profile";

export interface NavItem {
  href: AppRoute;
  label: string;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  trend: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  at: string;
  type: "schedule" | "billing" | "system";
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
}

export interface SubjectConstraint {
  name: string;
  weeklyHours: number;
  maxPerDay?: number;
}

export interface FacultyConstraint {
  name: string;
  canTeach: string[];
  unavailableDays?: string[];
}

export interface RoomConstraint {
  name: string;
  capacity: number;
}

export interface BreakRule {
  id: string;
  name: string;
  afterSlot: number;
}

export interface SlotTiming {
  start: string;
  end: string;
}

export interface SchedulerConstraints {
  days: string[];
  slotsPerDay: number;
  slotTimings: SlotTiming[];
  subjects: SubjectConstraint[];
  faculties: FacultyConstraint[];
  rooms: RoomConstraint[];
}

export interface TimetableSlot {
  day: string;
  slotLabel: string;
  subject: string;
  faculty: string;
  room: string;
}

export interface TimetableVariant {
  id: string;
  name: string;
  score: number;
  createdAt: string;
  slots: TimetableSlot[];
}

export interface AIExplanation {
  summary: string;
  highlights: string[];
  warnings: string[];
}

// ── WORKSPACE (TEAMS) TYPES ──

export type TeamRole = "owner" | "admin" | "viewer";

export interface WorkspaceMember {
  userId: string;
  email: string;
  role: TeamRole;
  joinedAt: Date | string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date | string;
  members: WorkspaceMember[];
}

export type EmergencyEventType =
  | "faculty_unavailable"
  | "room_unavailable"
  | "slot_blocked";

export interface EmergencyDisruptionEvent {
  type: EmergencyEventType;
  entityName?: string;
  day?: string;
  slotLabel?: string;
  reason?: string;
}

export interface EmergencySlotChange {
  subject: string;
  from: {
    day: string;
    slotLabel: string;
    faculty: string;
    room: string;
  };
  to: {
    day: string;
    slotLabel: string;
    faculty: string;
    room: string;
  };
}

export interface EmergencyProposal {
  id: string;
  label: string;
  summary: string;
  disruptionScore: number;
  unresolvedCount: number;
  updatedVariant: TimetableVariant;
  changes: EmergencySlotChange[];
}

export interface EmergencyImpactAnalysis {
  event: EmergencyDisruptionEvent;
  impactedSlots: TimetableSlot[];
  proposals: EmergencyProposal[];
  message: string;
}

export interface VariantMetric {
  variantId: string;
  utilization: number;
  roomBalance: number;
  facultyLoad: number;
  clashCount: number;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  category: "info" | "success" | "warning";
}

export type PlanId = "free" | "pro" | "department" | "institution";

export type BillingIntervalId = "monthly" | "yearly";

export interface PlanFeatures {
  maxVariants: number;
  adminSeats: number;
  pdfExport: boolean;
  pdfWatermark: boolean;
  excelExport: boolean;
  aiExplanations: boolean;
  emergencyReschedule: boolean;
  analytics: boolean;
  versionHistory: boolean;
  googleCalendarSync: boolean;
  maxTemplates: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  onboardingWizard: boolean;
  historicalAnalytics: boolean;
  prioritySupport: boolean;
  conflictExplainer: boolean;
  facultyView: boolean;
  showAds: boolean;
  bulkGeneration: boolean;
}

export interface PricingValue {
  usd: string;
  inr?: string;
}

export interface PricingTier {
  id: PlanId;
  title: string;
  monthlyPrice: PricingValue;
  yearlyPrice: PricingValue | null;
  description: string;
  bestFor: string;
  features: string[];
  highlighted?: boolean;
}

export interface BillingSummary {
  currentPlan: PlanId;
  status: string;
  billingInterval: BillingIntervalId | null;
  subscriptionEnd: string | null;
  canManagePaymentMethod: boolean;
  features: PlanFeatures;
  supportResponseHours: number;
  trialAvailable: boolean;
  refundEligible: boolean;
}

export interface UserProfile {
  fullName: string;
  email: string;
  role: string;
  organization: string;
  timezone: string;
}

export interface SchedulerTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  constraints: SchedulerConstraints;
  breaks?: BreakRule[];
  createdAt: string;
  usageCount: number;
}

export interface BrandingConfig {
  logoUrl: string;
  institutionName: string;
  primaryColor: string;
}


