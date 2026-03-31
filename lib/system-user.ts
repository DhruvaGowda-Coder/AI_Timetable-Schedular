import { env } from "@/lib/env";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function getSystemUserId() {
  if (!useDatabase) return null;

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function getCurrentWorkspaceId() {
  const userId = await getSystemUserId();
  if (!userId) return null;

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("schedulr_workspace_id")?.value;
  return workspaceId || userId;
}


