import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const dotenvPath = path.join(cwd, ".env");
const dotenvLocalPath = path.join(cwd, ".env.local");

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
  const mainEnv =
    fs.existsSync(dotenvPath) && fs.statSync(dotenvPath).isFile()
      ? parseDotenv(fs.readFileSync(dotenvPath, "utf8"))
      : {};
  const localEnv =
    fs.existsSync(dotenvLocalPath) && fs.statSync(dotenvLocalPath).isFile()
      ? parseDotenv(fs.readFileSync(dotenvLocalPath, "utf8"))
      : {};
  return {
    ...mainEnv,
    ...localEnv,
    ...process.env,
  };
}

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const env = loadEnv();
const errors = [];
const warnings = [];

// ─── Core Auth ──────────────────────────────────────────────────────────────
const requiredAuth = ["NEXTAUTH_URL", "NEXTAUTH_SECRET"];
for (const key of requiredAuth) {
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

// ─── Google OAuth (optional) ────────────────────────────────────────────────
const googleConfigured = isSet(env.GOOGLE_CLIENT_ID) || isSet(env.GOOGLE_CLIENT_SECRET);
if (googleConfigured && (!isSet(env.GOOGLE_CLIENT_ID) || !isSet(env.GOOGLE_CLIENT_SECRET))) {
  errors.push("Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}

// ─── Firebase (required) ────────────────────────────────────────────────────
if (!isSet(env.FIREBASE_PROJECT_ID)) {
  errors.push("FIREBASE_PROJECT_ID is required for database access.");
}
if (isSet(env.FIREBASE_PROJECT_ID)) {
  if (!isSet(env.FIREBASE_CLIENT_EMAIL)) {
    errors.push("FIREBASE_CLIENT_EMAIL is required when FIREBASE_PROJECT_ID is set.");
  }
  if (!isSet(env.FIREBASE_PRIVATE_KEY)) {
    errors.push("FIREBASE_PRIVATE_KEY is required when FIREBASE_PROJECT_ID is set.");
  }
}

// ─── SMTP (optional) ────────────────────────────────────────────────────────
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

// ─── LemonSqueezy (optional) ────────────────────────────────────────────────
const lemonConfigured =
  isSet(env.LEMON_SQUEEZY_API_KEY) ||
  isSet(env.LEMON_SQUEEZY_STORE_ID) ||
  isSet(env.LEMON_SQUEEZY_WEBHOOK_SECRET);
if (
  lemonConfigured &&
  (!isSet(env.LEMON_SQUEEZY_API_KEY) ||
    !isSet(env.LEMON_SQUEEZY_STORE_ID) ||
    !isSet(env.LEMON_SQUEEZY_WEBHOOK_SECRET))
) {
  errors.push(
    "LemonSqueezy is partially configured. Set LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, and LEMON_SQUEEZY_WEBHOOK_SECRET."
  );
}

// ─── Razorpay (optional) ────────────────────────────────────────────────────
const razorpayConfigured =
  isSet(env.RAZORPAY_KEY_ID) ||
  isSet(env.RAZORPAY_KEY_SECRET) ||
  isSet(env.RAZORPAY_WEBHOOK_SECRET);
if (
  razorpayConfigured &&
  (!isSet(env.RAZORPAY_KEY_ID) ||
    !isSet(env.RAZORPAY_KEY_SECRET) ||
    !isSet(env.RAZORPAY_WEBHOOK_SECRET))
) {
  errors.push(
    "Razorpay is partially configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET."
  );
}

// ─── Groq AI (optional) ─────────────────────────────────────────────────────
if (!isSet(env.GROQ_API_KEY)) {
  warnings.push("GROQ_API_KEY is not set. AI explanations will be unavailable.");
}

// ─── Report ─────────────────────────────────────────────────────────────────
if (errors.length === 0 && warnings.length === 0) {
  console.log("✅ Predeploy check passed.");
  process.exit(0);
}

if (warnings.length > 0) {
  console.log("\n⚠️  Warnings:");
  for (const warning of warnings) {
    console.log(`  - ${warning}`);
  }
}

if (errors.length > 0) {
  console.log("\n❌ Errors:");
  for (const error of errors) {
    console.log(`  - ${error}`);
  }
  process.exit(1);
}

console.log("\n✅ Predeploy check passed with warnings.");
