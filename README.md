# Schedulr AI

Professional AI timetable scheduler built with Next.js App Router, Tailwind, shadcn/ui, Framer Motion, Prisma, NextAuth, Recharts, FullCalendar, and Stripe.

## Included routes

- `/`
- `/dashboard`
- `/scheduler`
- `/analytics`
- `/notifications`
- `/billing`
- `/profile`
- `/login`
- `/signup`
- `/forgot-password`

## Stack

- Next.js 15 + TypeScript
- Tailwind CSS + `tailwindcss-animate`
- shadcn/ui components
- Framer Motion
- PostgreSQL + Prisma schema
- NextAuth (Google + credentials + OTP endpoints)
- FullCalendar
- Recharts
- jsPDF + `jspdf-autotable`
- SheetJS (`xlsx-js-style`)
- Stripe Checkout + Webhook routes

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
copy .env.example .env.local
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Start development server:

```bash
npm run dev
```

## Pre-deploy check

Run this before deploying to a real server:

```bash
npm run predeploy:check
```

It validates critical env configuration (database/auth/SMTP/Stripe) and fails on partial or unsafe setup.

## Clean generated files

If project size grows due to local build artifacts, run:

```bash
npm run clean
```

This removes `.next`, `.next-dev`, and `tsconfig.tsbuildinfo`.

## Auth and OTP

- Configure `DATABASE_URL` before using signup/login/password reset.
- Configure SMTP values in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`) for OTP delivery.

## Stripe setup (test mode)

1. Set these env vars:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
NEXTAUTH_URL=https://your-domain
```

2. In Stripe, create recurring monthly and yearly prices for Basic and Premium, then copy IDs into the four `STRIPE_PRICE_*` variables above.
3. Configure webhook endpoint `POST /api/stripe/webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Enable and configure Stripe Billing Portal in the Stripe Dashboard (used by `POST /api/stripe/portal`).
5. Test the flow from `/billing` using Stripe test cards (for example, `4242 4242 4242 4242`).

## Subscription model (implemented)

- Free: ad-supported, up to 3 variants/generation, single PDF/Excel export, current analytics.
- Basic: ad-free, up to 7 variants/generation, advanced constraints, bulk PDF/Excel ZIP export.
- Premium: ad-free, unlimited variants, Excel import, emergency rescheduling, historical analytics, priority support.
- No free trial. Users start on Free and can upgrade anytime.
- No refunds for paid plans.

## Supabase table readability

- Table descriptions are documented in `docs/supabase-table-guide.md`.
- If your DB is already running and only the `Payment` table is missing, run `scripts/supabase-payment-table.sql` in Supabase SQL Editor.

## Project summary

Schedulr AI is a full-stack timetable management platform that combines schedule generation, analytics, authentication, and billing in one product. It is designed for departments and institutions that need faster timetable planning with fewer manual conflicts.

The system supports multi-variant generation, plan-based feature controls, and operational dashboards for decision making. It also includes deployment-focused checks so environment issues are caught early.

## Resume highlights

- Built a production-ready SaaS timetable platform using Next.js 15, TypeScript, Prisma, PostgreSQL, and Stripe.
- Implemented multi-variant timetable generation and comparison workflows to improve planning speed and quality.
- Developed analytics dashboards for faculty load, room occupation, utilization, and peak-hour trends using Recharts.
- Integrated authentication flows with NextAuth, OTP support, and protected API routes.
- Added subscription lifecycle support with Stripe Checkout, webhook handling, and feature gating by plan.
- Enforced release quality with linting, type checks, build verification, and predeploy environment validation.


