import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const wsDoc = await adminDb.collection("workspaces").doc(id).get();

    if (!wsDoc.exists) {
      return NextResponse.json(
        { message: "Workspace not found." },
        { status: 404 }
      );
    }

    const wsData = wsDoc.data()!;
    const memberIds: string[] = wsData.memberIds || [];

    if (!memberIds.includes(userId)) {
      return NextResponse.json(
        { message: "You are not a member of this workspace." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      members: wsData.members || [],
      ownerId: wsData.ownerId,
    });
  } catch (error) {
    console.error("List members error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const targetUserId = body?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { message: "Target userId is required." },
        { status: 400 }
      );
    }

    const wsRef = adminDb.collection("workspaces").doc(id);
    const wsDoc = await wsRef.get();

    if (!wsDoc.exists) {
      return NextResponse.json(
        { message: "Workspace not found." },
        { status: 404 }
      );
    }

    const wsData = wsDoc.data()!;
    const members: any[] = wsData.members || [];
    const currentUser = members.find((m: any) => m.userId === userId);

    if (!currentUser) {
      return NextResponse.json(
        { message: "You are not a member of this workspace." },
        { status: 403 }
      );
    }

    // Only owner or admin can remove members
    if (currentUser.role !== "owner" && currentUser.role !== "admin") {
      return NextResponse.json(
        { message: "Only owners and admins can remove members." },
        { status: 403 }
      );
    }

    // Cannot remove the owner
    if (targetUserId === wsData.ownerId) {
      return NextResponse.json(
        { message: "Cannot remove the workspace owner." },
        { status: 400 }
      );
    }

    // Admins cannot remove other admins — only owner can
    const targetMember = members.find((m: any) => m.userId === targetUserId);
    if (!targetMember) {
      return NextResponse.json(
        { message: "User is not a member of this workspace." },
        { status: 404 }
      );
    }
    if (targetMember.role === "admin" && currentUser.role !== "owner") {
      return NextResponse.json(
        { message: "Only the owner can remove admins." },
        { status: 403 }
      );
    }

    // Remove from both memberIds and members arrays
    const updatedMembers = members.filter(
      (m: any) => m.userId !== targetUserId
    );

    await wsRef.update({
      memberIds: admin.firestore.FieldValue.arrayRemove(targetUserId),
      members: updatedMembers,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
