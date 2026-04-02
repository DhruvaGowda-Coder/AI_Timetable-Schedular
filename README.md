# TimetabiQ

AI-powered timetable management software for schools, colleges, and universities.  
Built with Next.js 15 App Router, Tailwind CSS, Firebase Firestore, NextAuth, LemonSqueezy, and Razorpay.

## Routes

- `/` — Landing page (public)
- `/dashboard` — Dashboard with stats, calendar, activity
- `/scheduler` — Timetable generation with constraint editor
- `/analytics` — Faculty workload & room utilization charts
- `/notifications` — In-app notifications
- `/billing` — Subscription management (LemonSqueezy + Razorpay)
- `/profile` — User profile settings
- `/login` / `/signup` / `/forgot-password` — Authentication flows
- `/university-timetable-software` — SEO pillar page
- `/ai-scheduling-software` — SEO pillar page

## Stack

- **Framework**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion
- **Database**: Firebase Firestore (Admin SDK)
- **Auth**: NextAuth v4 (Google OAuth + Credentials + OTP)
- **Payments**: LemonSqueezy (international USD) + Razorpay (India INR)
- **AI**: Groq API for AI explanations
- **Charts**: Recharts + FullCalendar
- **Exports**: jsPDF + xlsx-js-style

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Configure environment — copy `.env.local` and fill in your credentials:

```bash
# Required variables:
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

FIREBASE_PROJECT_ID=<your project id>
FIREBASE_CLIENT_EMAIL=<service account email>
FIREBASE_PRIVATE_KEY=<service account private key>

GROQ_API_KEY=<from Groq dashboard>

LEMON_SQUEEZY_API_KEY=<from LemonSqueezy>
LEMON_SQUEEZY_STORE_ID=<your store id>
LEMON_SQUEEZY_WEBHOOK_SECRET=<your webhook secret>

RAZORPAY_KEY_ID=<from Razorpay dashboard>
RAZORPAY_KEY_SECRET=<from Razorpay dashboard>
RAZORPAY_WEBHOOK_SECRET=<your webhook secret>
```

3. Start development server:

```bash
npm run dev
```

## Pre-deploy Check

Run before deploying to production:

```bash
npm run predeploy:check
```

Validates critical environment configuration and fails on partial or unsafe setup.

## Clean Build Artifacts

```bash
npm run clean
```

Removes `.next`, `.next-dev`, and `tsconfig.tsbuildinfo`.

## Subscription Model

| Plan | USD/mo | INR/mo | Features |
|------|--------|--------|----------|
| Free | $0 | ₹0 | 1 seat, 3 variants, watermarked PDF, ads |
| Pro | $19 | ₹1,499 | Unlimited variants, Excel export, AI explanations, no ads |
| Department | $59 | ₹4,999 | 3 seats, white label PDF, onboarding wizard |
| Institution | $129 | ₹9,999 | 10 seats, historical analytics, bulk generation, priority support |

## Webhook Setup

### LemonSqueezy
- Endpoint: `POST /api/lemonsqueezy/webhook`
- Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_resumed`

### Razorpay
- Endpoint: `POST /api/razorpay/webhook`
- Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.expired`, `subscription.halted`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/scheduler/generate` | Optional | Generate timetable variants |
| GET | `/api/dashboard` | Session | Dashboard stats |
| GET/POST | `/api/billing` | Session | Billing summary / plan switch (dev) |
| POST | `/api/scheduler/emergency` | Session | Emergency rescheduling |
| POST | `/api/scheduler/explain` | Session | AI conflict explanations |
| POST | `/api/export` | Session | PDF/Excel export |
| GET | `/api/health` | None | Health check |

## Security

- JWT-based sessions via NextAuth
- HMAC SHA-256 webhook signature verification (timing-safe)
- bcrypt password + OTP hashing
- SHA-256 API key hashing
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- Rate limiting on generation endpoints
