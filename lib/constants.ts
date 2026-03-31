import type { NavItem, PricingTier, SchedulerConstraints } from "@/lib/types";
import { createDefaultSlotTimings } from "@/lib/scheduler-utils";

export const APP_NAME = "Schedulr AI";

export const APP_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scheduler", label: "Scheduler" },
  { href: "/analytics", label: "Analytics" },
  { href: "/notifications", label: "Notifications" },
  { href: "/billing", label: "Billing" },
  { href: "/profile", label: "Profile" },
];

export const DEFAULT_CONSTRAINTS: SchedulerConstraints = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  slotsPerDay: 6,
  slotTimings: createDefaultSlotTimings(6),
  subjects: [
    { name: "Mathematics", weeklyHours: 4 },
    { name: "Physics", weeklyHours: 3 },
    { name: "Chemistry", weeklyHours: 3 },
    { name: "Computer Science", weeklyHours: 5 },
    { name: "English", weeklyHours: 2 },
  ],
  faculties: [
    { name: "Dr. Smith", canTeach: ["Mathematics", "Physics"] },
    { name: "Prof. Johnson", canTeach: ["Chemistry", "Biology"] },
    { name: "Ms. Davis", canTeach: ["English"] },
    { name: "Mr. Wilson", canTeach: ["Computer Science"] },
    { name: "Dr. Brown", canTeach: ["Mathematics", "Computer Science"] },
  ],
  rooms: [
    { name: "Room 101", capacity: 30 },
    { name: "Lab A", capacity: 20 },
    { name: "Auditorium", capacity: 100 },
    { name: "Room 202", capacity: 40 },
    { name: "Comp Lab", capacity: 25 },
  ],
};

export const LEMON_SQUEEZY_VARIANTS = {
  pro_monthly:         process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
  pro_yearly:          process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID,
  department_monthly:  process.env.LEMONSQUEEZY_DEPT_MONTHLY_VARIANT_ID,
  department_yearly:   process.env.LEMONSQUEEZY_DEPT_YEARLY_VARIANT_ID,
  institution_monthly: process.env.LEMONSQUEEZY_INST_MONTHLY_VARIANT_ID,
  institution_yearly:  process.env.LEMONSQUEEZY_INST_YEARLY_VARIANT_ID,
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    title: "Free",
    monthlyPrice: { usd: "$0", inr: "₹0" },
    yearlyPrice: { usd: "$0", inr: "₹0" },
    description: "For individuals just getting started.",
    bestFor: "Students, casual users",
    features: [
      "1 Admin Seat",
      "Up to 3 variants per generation",
      "PDF Export (Watermarked)",
      "Ads enabled",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    monthlyPrice: { usd: "$19", inr: "₹1,499" },
    yearlyPrice: { usd: "$182", inr: "₹14,390" },
    description: "For individual faculty who need more power.",
    bestFor: "Individual faculty",
    features: [
      "1 Admin Seat",
      "Unlimited variants",
      "No Watermark on PDF",
      "Excel Export",
      "AI Explanations",
      "Emergency Rescheduling",
      "Google Calendar Sync",
      "No ads",
    ],
    highlighted: true,
  },
  {
    id: "department",
    title: "Department",
    monthlyPrice: { usd: "$59", inr: "₹4,999" },
    yearlyPrice: { usd: "$566", inr: "₹47,990" },
    description: "For small teams and departments.",
    bestFor: "Small departments",
    features: [
      "3 Admin Seats",
      "Everything in Pro",
      "White Label PDF",
      "Onboarding Wizard",
    ],
  },
  {
    id: "institution",
    title: "Institution",
    monthlyPrice: { usd: "$129", inr: "₹9,999" },
    yearlyPrice: { usd: "$1,238", inr: "₹95,990" },
    description: "For entire institutions.",
    bestFor: "Universities, large schools",
    features: [
      "10 Admin Seats",
      "Everything in Department",
      "Historical Analytics",
      "Priority Support",
      "Bulk Generation",
    ],
  },
];


