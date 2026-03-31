import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const dotenvPath = path.join(cwd, ".env");

function parseDotenv(content) {
  const parsed = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function loadEnv() {
  const fileEnv =
    fs.existsSync(dotenvPath) && fs.statSync(dotenvPath).isFile()
      ? parseDotenv(fs.readFileSync(dotenvPath, "utf8"))
      : {};
  return {
    ...fileEnv,
    ...process.env,
  };
}

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const env = loadEnv();
const errors = [];
const warnings = [];

const required = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"];
for (const key of required) {
  if (!isSet(env[key])) {
    errors.push(`${key} is required.`);
  }
}

if (isSet(env.NEXTAUTH_SECRET) && env.NEXTAUTH_SECRET === "dev-secret-change-me") {
  errors.push("NEXTAUTH_SECRET is using the insecure default value.");
}
if (isSet(env.NEXTAUTH_SECRET) && String(env.NEXTAUTH_SECRET).length < 24) {
  warnings.push("NEXTAUTH_SECRET should be at least 24 characters.");
}

if (isSet(env.NEXTAUTH_URL)) {
  let parsedUrl;
  try {
    parsedUrl = new URL(env.NEXTAUTH_URL);
  } catch {
    errors.push("NEXTAUTH_URL is not a valid URL.");
  }

  if (parsedUrl) {
    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
      warnings.push("NEXTAUTH_URL should use https in production.");
    }
    if (parsedUrl.hostname === "localhost") {
      warnings.push("NEXTAUTH_URL is set to localhost; change it before production deploy.");
    }
  }
}

const googleConfigured = isSet(env.GOOGLE_CLIENT_ID) || isSet(env.GOOGLE_CLIENT_SECRET);
if (googleConfigured && (!isSet(env.GOOGLE_CLIENT_ID) || !isSet(env.GOOGLE_CLIENT_SECRET))) {
  errors.push("Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}

const smtpConfigured =
  isSet(env.SMTP_HOST) ||
  isSet(env.SMTP_USER) ||
  isSet(env.SMTP_PASS) ||
  isSet(env.SMTP_FROM_EMAIL);
if (
  smtpConfigured &&
  (!isSet(env.SMTP_HOST) ||
    !isSet(env.SMTP_PORT) ||
    !isSet(env.SMTP_USER) ||
    !isSet(env.SMTP_PASS) ||
    !isSet(env.SMTP_FROM_EMAIL))
) {
  errors.push(
    "SMTP is partially configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL."
  );
}

const stripeBasicMonthly = env.STRIPE_PRICE_BASIC_MONTHLY ?? env.STRIPE_PRICE_BASIC;
const stripePremiumMonthly = env.STRIPE_PRICE_PREMIUM_MONTHLY ?? env.STRIPE_PRICE_PREMIUM;
const stripeBasicYearly = env.STRIPE_PRICE_BASIC_YEARLY;
const stripePremiumYearly = env.STRIPE_PRICE_PREMIUM_YEARLY;

const stripeConfigured =
  isSet(env.STRIPE_SECRET_KEY) ||
  isSet(env.STRIPE_WEBHOOK_SECRET) ||
  isSet(stripeBasicMonthly) ||
  isSet(stripePremiumMonthly) ||
  isSet(stripeBasicYearly) ||
  isSet(stripePremiumYearly);
if (
  stripeConfigured &&
  (!isSet(env.STRIPE_SECRET_KEY) ||
    !isSet(env.STRIPE_WEBHOOK_SECRET) ||
    !isSet(stripeBasicMonthly) ||
    !isSet(stripePremiumMonthly) ||
    !isSet(stripeBasicYearly) ||
    !isSet(stripePremiumYearly))
) {
  errors.push(
    "Stripe is partially configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_BASIC_YEARLY, STRIPE_PRICE_PREMIUM_MONTHLY, and STRIPE_PRICE_PREMIUM_YEARLY."
  );
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("Predeploy check passed.");
  process.exit(0);
}

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.log("Errors:");
  for (const error of errors) {
    console.log(`- ${error}`);
  }
  process.exit(1);
}

console.log("Predeploy check passed with warnings.");


