import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  clearInMemoryApiKeyRecord,
  generateApiKey,
  getInMemoryApiKeyRecord,
  setInMemoryApiKeyRecord,
} from "@/lib/api-keys";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { getUserBillingSummary } from "@/lib/subscription";

export const runtime = "nodejs";

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!useDatabase) {
      return NextResponse.json(
        { message: "Profile API key management requires a database." },
        { status: 503 }
      );
    }

    const billingSummary = await getUserBillingSummary(userId);

    let apiKeyPayload: {
      hasApiKey: boolean;
      keyPrefix: string | null;
      createdAt: string | null;
      lastUsedAt: string | null;
      storageMode: "database" | "memory";
    } = {
      hasApiKey: false,
      keyPrefix: null,
      createdAt: null,
      lastUsedAt: null,
      storageMode: "database",
    };

    try {
      const userRef = adminDb.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      // Convert Firebase Timestamps to ISO string if needed
      const createdAtIso = userData?.apiKeyCreatedAt?.toDate ? userData.apiKeyCreatedAt.toDate().toISOString() : (userData?.apiKeyCreatedAt || null);
      const lastUsedAtIso = userData?.apiKeyLastUsedAt?.toDate ? userData.apiKeyLastUsedAt.toDate().toISOString() : (userData?.apiKeyLastUsedAt || null);

      apiKeyPayload = {
        hasApiKey: Boolean(userData?.apiKeyHash),
        keyPrefix: userData?.apiKeyPrefix ?? null,
        createdAt: createdAtIso,
        lastUsedAt: lastUsedAtIso,
        storageMode: "database",
      };
    } catch (error) {
      const record = getInMemoryApiKeyRecord(userId);
      apiKeyPayload = {
        hasApiKey: Boolean(record),
        keyPrefix: record?.apiKeyPrefix ?? null,
        createdAt: record?.createdAtIso ?? null,
        lastUsedAt: record?.lastUsedAtIso ?? null,
        storageMode: "memory",
      };
    }

    return NextResponse.json({
      plan: billingSummary.currentPlan,
      canUseApi: billingSummary.currentPlan === "institution",
      ...apiKeyPayload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to load API key settings.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!useDatabase) {
      return NextResponse.json(
        { message: "Profile API key management requires a database." },
        { status: 503 }
      );
    }

    const billingSummary = await getUserBillingSummary(userId);
    if (billingSummary.currentPlan !== "institution") {
      return NextResponse.json(
        { message: "API keys are available for Institution subscriptions only." },
        { status: 403 }
      );
    }

    const generated = generateApiKey();
    let storageMode: "database" | "memory" = "database";

    try {
      const userRef = adminDb.collection("users").doc(userId);
      await userRef.update({
        apiKeyHash: generated.apiKeyHash,
        apiKeyPrefix: generated.apiKeyPrefix,
        apiKeyCreatedAt: new Date(),
        apiKeyLastUsedAt: null,
      });
    } catch (error) {
      storageMode = "memory";
      setInMemoryApiKeyRecord(userId, generated.apiKeyHash, generated.apiKeyPrefix);
    }

    return NextResponse.json({
      message: "API key generated successfully.",
      apiKey: generated.rawApiKey,
      keyPrefix: generated.apiKeyPrefix,
      storageMode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to generate API key.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!useDatabase) {
      return NextResponse.json(
        { message: "Profile API key management requires a database." },
        { status: 503 }
      );
    }

    let storageMode: "database" | "memory" = "database";
    try {
      const userRef = adminDb.collection("users").doc(userId);
      await userRef.update({
        apiKeyHash: null,
        apiKeyPrefix: null,
        apiKeyCreatedAt: null,
        apiKeyLastUsedAt: null,
      });
    } catch (error) {
      storageMode = "memory";
      clearInMemoryApiKeyRecord(userId);
    }

    return NextResponse.json({ message: "API key revoked successfully.", storageMode });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to revoke API key.",
      },
      { status: 500 }
    );
  }
}


