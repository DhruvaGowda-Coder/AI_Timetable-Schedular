const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Attempting to fix schema via raw SQL...");

        // 1. Create Enum (PlanTier)
        // We wrap in a DO block to handle 'already exists' gracefully
        try {
            await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "PlanTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
            console.log("Enum 'PlanTier' processed.");
        } catch (e) {
            console.warn("Enum creation warning:", e.message);
        }

        // 2. Add 'tier' Column
        await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tier" "PlanTier" DEFAULT 'FREE';
    `);
        console.log("Column 'tier' added to 'User' table.");

        // 3. Add 'subscriptionStatus' Column
        await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';
    `);
        console.log("Column 'subscriptionStatus' added.");

        // 4. Add 'billingInterval' Enum & Column
        try {
            await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        } catch (e) { }

        await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval";
    `);
        console.log("Column 'billingInterval' added.");

        // 5. Add other likely missing columns based on schema
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionEnd" TIMESTAMP(3);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiKeyHash" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiKeyPrefix" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiKeyCreatedAt" TIMESTAMP(3);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiKeyLastUsedAt" TIMESTAMP(3);`);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_apiKeyHash_key" ON "User"("apiKeyHash");`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval";`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adsEnabled" BOOLEAN DEFAULT true;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "advancedConstraintsEnabled" BOOLEAN DEFAULT false;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "importEnabled" BOOLEAN DEFAULT false;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyEnabled" BOOLEAN DEFAULT false;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "historicalEnabled" BOOLEAN DEFAULT false;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supportPriority" BOOLEAN DEFAULT false;`);
        console.log("Remaining potential missing columns added.");

        console.log("Migration successful!");
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();


