# 🚀 TimetabiQ — AI Timetable Scheduler (SaaS)

AI-powered timetable management platform designed for schools, colleges, and universities to automate complex scheduling and eliminate manual errors.

---

## 🌐 Live Demo

👉 https://timetabiq.com

---

## 🎯 Problem Solved

Manual timetable creation is time-consuming, error-prone, and difficult to scale with multiple constraints like faculty availability, room allocation, and time slots.

---

## 💡 Solution

TimetabiQ uses a constraint satisfaction engine combined with genetic algorithms to generate conflict-free academic timetables at scale (supporting up to 10,000 variants), reducing scheduling complexity and human errors.

---

## ⚙️ Key Features

* AI-powered timetable generation (multi-variant)
* Constraint editor (subjects, faculty, rooms, time slots)
* Emergency rescheduling system
* AI conflict explanation (Groq API)
* PDF & Excel export with branding
* Shareable timetable links
* Multi-tenant SaaS architecture
* Dual payment system (Razorpay + LemonSqueezy)

---

## 🧠 How It Works

Input Constraints → Normalize Data → Generate Variants (Genetic Algorithm + CSP) → Score & Optimize → Output Conflict-Free Timetable

---

## 📊 Performance

* Supports up to **10,000 timetable variants**
* Handles **100–1,000 constraint scale**
* Optimized for real-time generation and variant comparison

---

## 🏗️ Tech Stack

* **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion
* **Backend**: Node.js, API Routes
* **Database**: Firebase Firestore (Admin SDK)
* **Authentication**: NextAuth v4 (Google OAuth + Credentials + OTP)
* **Payments**: LemonSqueezy (USD) + Razorpay (INR)
* **AI**: Groq API (conflict explanations)
* **Charts**: Recharts + FullCalendar
* **Exports**: jsPDF, xlsx-js-style

---

## 🧩 System Highlights

* Multi-tenant SaaS architecture
* Guest-first usage (no login required for core features)
* Local draft persistence + cloud sync
* Serverless deployment (Vercel)
* Secure webhook handling for subscriptions

---

## 🚀 Run Locally

```bash
npm install
npm run dev
```

---

## 🔐 Environment Setup

Create `.env.local` and configure:

```bash
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

---

## 📦 Subscription Model

| Plan        | USD/mo | INR/mo | Features                                          |
| ----------- | ------ | ------ | ------------------------------------------------- |
| Free        | $0     | ₹0     | 1 seat, 3 variants, watermarked PDF, ads          |
| Pro         | $19    | ₹1,499 | Unlimited variants, Excel export, AI explanations |
| Department  | $59    | ₹4,999 | 3 seats, white label PDF, onboarding              |
| Institution | $129   | ₹9,999 | 10 seats, analytics, bulk generation              |

---

## 🔗 API Highlights

* `/api/scheduler/generate` → Generate timetable variants
* `/api/scheduler/emergency` → Handle disruptions
* `/api/scheduler/explain` → AI conflict explanations
* `/api/export` → Export PDF/Excel
* `/api/dashboard` → Analytics data

---

## 🔒 Security

* JWT-based authentication (NextAuth)
* HMAC SHA-256 webhook verification
* bcrypt password & OTP hashing
* Rate limiting on generation endpoints
* Secure headers (HSTS, X-Frame, etc.)

---

## 📌 Status

Production-ready SaaS system with live deployment and real-world usage.

---
