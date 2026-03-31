import { NextResponse } from "next/server";
import { admin, adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";

export async function POST(request: Request) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.token) {
      return NextResponse.json({ message: "Invitation token is required." }, { status: 400 });
    }

    const inviteRef = adminDb.collection("workspace_invites").doc(body.token);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ message: "Invalid or expired invitation." }, { status: 404 });
    }

    const inviteData = inviteDoc.data()!;
    
    // Check expiration
    if (new Date(inviteData.expiresAt) < new Date()) {
      await inviteRef.delete();
      return NextResponse.json({ message: "This invitation has expired." }, { status: 410 });
    }

    // Add user to workspace
    const workspaceId = inviteData.workspaceId;
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    
    const wsDoc = await wsRef.get();
    if (!wsDoc.exists) {
      return NextResponse.json({ message: "The workspace no longer exists." }, { status: 404 });
    }

    // Get current user email
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userEmail = userDoc.data()?.email ?? "unknown";

    const wsData = wsDoc.data()!;
    const memberIds = wsData.memberIds || [];
    const members = wsData.members || [];

    // Check if already a member
    if (memberIds.includes(userId)) {
      await inviteRef.delete();
      return NextResponse.json({ message: "You are already a member of this workspace." }, { status: 400 });
    }

    // Add exactly as they were invited
    const newMember = {
      userId,
      email: userEmail,
      role: inviteData.role || "viewer",
      joinedAt: new Date().toISOString(),
    };

    await wsRef.update({
      memberIds: admin.firestore.FieldValue.arrayUnion(userId),
      members: admin.firestore.FieldValue.arrayUnion(newMember),
    });

    // Delete the token
    await inviteRef.delete();

    return NextResponse.json({ success: true, workspaceId });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}


