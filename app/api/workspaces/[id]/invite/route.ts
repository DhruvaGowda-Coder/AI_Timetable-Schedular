import { NextResponse } from "next/server";
import { admin, adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";
import { getUserBillingSummary } from "@/lib/subscription";
import { sendEmail } from "@/lib/email";
import { nanoid } from "nanoid";
import { getAppBaseUrl } from "@/lib/env";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Plan gating: only Department+ can invite team members
    const billing = await getUserBillingSummary(userId);
    if (!billing.features.adminSeats || billing.features.adminSeats <= 1) {
      return NextResponse.json(
        { message: "Team support requires a Department plan or above. Upgrade to invite members." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    
    if (!body?.email || !id) {
      return NextResponse.json(
        { message: "Valid email and workspace ID are required." },
        { status: 400 }
      );
    }
    const targetEmail = body.email.trim().toLowerCase();

    // Check if user has permission to invite
    const wsRef = adminDb.collection("workspaces").doc(id);
    const wsDoc = await wsRef.get();
    
    if (!wsDoc.exists) {
      return NextResponse.json({ message: "Workspace not found." }, { status: 404 });
    }

    const wsData = wsDoc.data()!;
    const members = wsData.members || [];
    const currentUserMember = members.find((m: any) => m.userId === userId);
    
    if (!currentUserMember || currentUserMember.role === "viewer") {
      return NextResponse.json(
        { message: "You do not have permission to invite members." },
        { status: 403 }
      );
    }

    // Check if already a member
    if (members.some((m: any) => m.email.toLowerCase() === targetEmail)) {
      return NextResponse.json(
        { message: "User is already a member of this workspace." },
        { status: 400 }
      );
    }

    const inviteToken = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await adminDb.collection("workspace_invites").doc(inviteToken).set({
      workspaceId: id,
      workspaceName: wsData.name,
      email: targetEmail,
      role: body.role || "viewer",
      invitedBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
    });

    const baseUrl = getAppBaseUrl(request);
    const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

    const sent = await sendEmail({
      to: targetEmail,
      subject: `You've been invited to ${wsData.name} on Schedulr AI`,
      text: `You have been invited to join the workspace "${wsData.name}" on Schedulr AI. Please click the following link to accept the invitation: ${inviteUrl}`,
      html: `
        <div style="font-family: sans-serif; max-w-md; margin: 0 auto; padding: 20px;">
          <h2>Join ${wsData.name} on Schedulr AI</h2>
          <p>You have been invited to collaborate on timetables.</p>
          <p>
            <a href="${inviteUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Link expires in 7 days. If the button doesn't work, copy and paste this into your browser: <br>${inviteUrl}
          </p>
        </div>
      `,
    });

    if (!sent) {
       // Proceed anyway, but maybe inform the client email wasn't sent due to SMTP issues.
       // We'll return the URL in development so the admin can copy-paste it.
    }

    return NextResponse.json({ 
      success: true, 
      inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : undefined 
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
