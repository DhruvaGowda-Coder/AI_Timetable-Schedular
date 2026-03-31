const placeholderTokens = ["[PROJECT-REF]", "[DB-PASSWORD]", "[POOLER-HOST]"];
const localhostHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function sanitizeConnectionString(value: string | undefined) {
  const raw = value ?? "";
  if (!raw) return "";
  const hasPlaceholder = placeholderTokens.some((token) => raw.includes(token));
  return hasPlaceholder ? "" : raw;
}

function normalizeBaseUrl(value: string | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return "";
  }
}

function resolveNextAuthUrl() {
  const configured = normalizeBaseUrl(process.env.NEXTAUTH_URL);
  if (configured) return configured;
  return normalizeBaseUrl(process.env.VERCEL_URL);
}

function isLocalhostUrl(value: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return localhostHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

const resolvedNextAuthUrl = resolveNextAuthUrl();

// In development, trust the active request host so OAuth flow stays on the
// same local hostname/port the user opened (localhost vs 127.0.0.1, etc).
// In production, only fall back to host detection when NEXTAUTH_URL is absent.
const shouldTrustRequestHost =
  process.env.NODE_ENV !== "production" || !resolvedNextAuthUrl;

if (!process.env.AUTH_TRUST_HOST && shouldTrustRequestHost) {
  process.env.AUTH_TRUST_HOST = "true";
}

export const env = {
  DATABASE_URL: sanitizeConnectionString(process.env.DATABASE_URL),
  DIRECT_URL: sanitizeConnectionString(process.env.DIRECT_URL),
  NEXTAUTH_URL: resolvedNextAuthUrl,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? "",
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME ?? "Schedulr AI",
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL ?? "",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  LEMON_SQUEEZY_API_KEY: process.env.LEMON_SQUEEZY_API_KEY ?? "",
  LEMON_SQUEEZY_WEBHOOK_SECRET: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "",
  LEMON_SQUEEZY_STORE_ID: process.env.LEMON_SQUEEZY_STORE_ID ?? "",
  LEMON_SQUEEZY_VARIANTS: {
    PRO_MONTHLY: process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID ?? "",
    PRO_YEARLY: process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID ?? "",
    DEPT_MONTHLY: process.env.LEMONSQUEEZY_DEPT_MONTHLY_VARIANT_ID ?? "",
    DEPT_YEARLY: process.env.LEMONSQUEEZY_DEPT_YEARLY_VARIANT_ID ?? "",
    INST_MONTHLY: process.env.LEMONSQUEEZY_INST_MONTHLY_VARIANT_ID ?? "",
    INST_YEARLY: process.env.LEMONSQUEEZY_INST_YEARLY_VARIANT_ID ?? "",
  },
  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  RAZORPAY_PLANS: {
    PRO_MONTHLY:  process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID ?? "",
    PRO_YEARLY:   process.env.RAZORPAY_PRO_YEARLY_PLAN_ID ?? "",
    DEPT_MONTHLY: process.env.RAZORPAY_DEPT_MONTHLY_PLAN_ID ?? "",
    DEPT_YEARLY:  process.env.RAZORPAY_DEPT_YEARLY_PLAN_ID ?? "",
    INST_MONTHLY: process.env.RAZORPAY_INST_MONTHLY_PLAN_ID ?? "",
    INST_YEARLY:  process.env.RAZORPAY_INST_YEARLY_PLAN_ID ?? "",
  },
};

export const hasGoogleAuth =
  env.GOOGLE_CLIENT_ID.length > 0 && env.GOOGLE_CLIENT_SECRET.length > 0;

export const hasSmtpConfig =
  env.SMTP_HOST.length > 0 &&
  Number.isFinite(env.SMTP_PORT) &&
  env.SMTP_PORT > 0 &&
  env.SMTP_USER.length > 0 &&
  env.SMTP_PASS.length > 0 &&
  env.SMTP_FROM_EMAIL.length > 0;

export const hasLemonSqueezy = env.LEMON_SQUEEZY_API_KEY.length > 0;
export const hasRazorpay = env.RAZORPAY_KEY_ID.length > 0 && env.RAZORPAY_KEY_SECRET.length > 0;

export const hasGroqApi = env.GROQ_API_KEY.length > 0;

export function getAppBaseUrl(requestLike: { url: string }) {
  const requestOrigin = new URL(requestLike.url).origin;
  const configured = env.NEXTAUTH_URL.trim();
  if (!configured) return requestOrigin;

  try {
    const configuredUrl = new URL(configured);
    const requestUrl = new URL(requestOrigin);
    const configuredIsLocalhost = localhostHosts.has(configuredUrl.hostname.toLowerCase());
    const requestIsLocalhost = localhostHosts.has(requestUrl.hostname.toLowerCase());

    // If NEXTAUTH_URL is local-only, prefer the incoming origin so local port
    // changes and deployed domains keep working without env rewrites.
    if (configuredIsLocalhost && (!requestIsLocalhost || configuredUrl.port !== requestUrl.port)) {
      return requestOrigin;
    }

    return configuredUrl.origin;
  } catch {
    return requestOrigin;
  }
}


