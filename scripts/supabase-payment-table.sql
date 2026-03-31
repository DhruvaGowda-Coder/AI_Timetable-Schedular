-- Run this in Supabase SQL Editor if Payment table is missing.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PaymentStatus'
  ) THEN
    CREATE TYPE "PaymentStatus" AS ENUM (
      'PENDING',
      'SUCCEEDED',
      'FAILED',
      'CANCELED',
      'REFUNDED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripeInvoiceId" TEXT,
  "amount" INTEGER,
  "currency" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Payment_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key"
  ON "Payment"("stripePaymentIntentId");

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeInvoiceId_key"
  ON "Payment"("stripeInvoiceId");

CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx"
  ON "Payment"("userId", "createdAt");

-- Optional readability alias: creates Event view if no Event relation exists.
DO $$
BEGIN
  IF to_regclass('"Event"') IS NULL THEN
    EXECUTE '
      CREATE VIEW "Event" AS
      SELECT
        "id",
        "userId",
        "title",
        "description",
        "startAt" AS "start",
        "endAt" AS "end",
        "color",
        "createdAt",
        "updatedAt"
      FROM "CalendarEvent"
    ';
  END IF;
END $$;


