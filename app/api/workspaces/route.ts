import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";
import { getUserBillingSummary } from "@/lib/subscription";
import type { Workspace } from "@/lib/types";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspacesSnapshot = await adminDb
      .collection("workspaces")
      .where("memberIds", "array-contains", userId)
      .get();

    const workspaces = workspacesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        createdAt:
          typeof data.createdAt?.toDate === "function"
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        members: data.members || [],
      } as Workspace;
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Fetch workspaces error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const billing = await getUserBillingSummary(userId);
    if (!billing.features.adminSeats || billing.features.adminSeats <= 1) {
      return NextResponse.json(
        { message: "Team workspaces require a Department plan or above." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body?.name?.trim()) {
      return NextResponse.json(
        { message: "Workspace name is required." },
        { status: 400 }
      );
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    const email = userDoc.data()?.email ?? "unknown@example.com";

    const workspaceId = `ws_${nanoid(12)}`;

    const newWorkspace = {
      id: workspaceId,
      name: body.name.trim(),
      ownerId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      memberIds: [userId],
      members: [
        {
          userId,
          email,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
      ],
    };

    await adminDb.collection("workspaces").doc(workspaceId).set(newWorkspace);

    return NextResponse.json({ workspace: newWorkspace });
  } catch (error) {
    console.error("Create workspace error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}


