import { createHash, randomBytes } from "crypto";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";

const API_KEY_PREFIX = "schedulr_live_";
const API_KEY_RANDOM_HEX_BYTES = 24;
const API_KEY_STORED_PREFIX_LENGTH = 24;

interface InMemoryApiKeyRecord {
  apiKeyHash: string;
  apiKeyPrefix: string;
  createdAtIso: string;
  lastUsedAtIso: string | null;
}

const inMemoryApiKeys = new Map<string, InMemoryApiKeyRecord>();

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export function hashApiKey(rawApiKey: string) {
  return createHash("sha256").update(rawApiKey).digest("hex");
}

export function generateApiKey() {
  const randomToken = randomBytes(API_KEY_RANDOM_HEX_BYTES).toString("hex");
  const rawApiKey = `${API_KEY_PREFIX}${randomToken}`;

  return {
    rawApiKey,
    apiKeyHash: hashApiKey(rawApiKey),
    apiKeyPrefix: rawApiKey.slice(0, API_KEY_STORED_PREFIX_LENGTH),
  };
}

export function getInMemoryApiKeyRecord(userId: string) {
  return inMemoryApiKeys.get(userId) ?? null;
}

export function setInMemoryApiKeyRecord(
  userId: string,
  apiKeyHash: string,
  apiKeyPrefix: string,
  createdAtIso = new Date().toISOString()
) {
  inMemoryApiKeys.set(userId, {
    apiKeyHash,
    apiKeyPrefix,
    createdAtIso,
    lastUsedAtIso: null,
  });
}

export function clearInMemoryApiKeyRecord(userId: string) {
  inMemoryApiKeys.delete(userId);
}

export async function resolveUserIdFromApiKey(rawApiKey: string) {
  if (!useDatabase) return null;
  const normalized = rawApiKey.trim();
  if (!normalized) return null;

  const apiKeyHash = hashApiKey(normalized);

  try {
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("apiKeyHash", "==", apiKeyHash).limit(1).get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await usersRef.doc(userDoc.id).update({
        apiKeyLastUsedAt: new Date(),
      }).catch(() => null);
      
      return userDoc.id;
    }
  } catch (error) {
    // Only fall back if Firestore is completely misconfigured or down
  }

  for (const [userId, record] of inMemoryApiKeys.entries()) {
    if (record.apiKeyHash !== apiKeyHash) continue;
    inMemoryApiKeys.set(userId, {
      ...record,
      lastUsedAtIso: new Date().toISOString(),
    });
    return userId;
  }

  return null;
}


