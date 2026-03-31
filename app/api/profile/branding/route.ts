import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId, getCurrentWorkspaceId } from "@/lib/system-user";
import { getUserBillingSummary } from "@/lib/subscription";

export async function GET() {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    const docId = workspaceId || userId;

    const doc = await adminDb
      .collection("branding_configs")
      .doc(docId)
      .get();

    if (!doc.exists) {
      return NextResponse.json({
        branding: { logoUrl: "", institutionName: "", primaryColor: "#3b82f6" },
      });
    }

    return NextResponse.json({ branding: doc.data() });
  } catch (error) {
    console.error("Get branding error:", error);
    return NextResponse.json(
      { message: "Failed to load branding." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const billing = await getUserBillingSummary(userId);
    if (!billing.features.whiteLabel) {
      return NextResponse.json(
        {
          message:
            "White-label PDF branding requires an Institution plan. Upgrade to customize your exports.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    const workspaceId = await getCurrentWorkspaceId();
    const docId = workspaceId || userId;

    const branding = {
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.slice(0, 5000) : "",
      institutionName:
        typeof body.institutionName === "string"
          ? body.institutionName.trim().slice(0, 200)
          : "",
      primaryColor:
        typeof body.primaryColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.primaryColor)
          ? body.primaryColor
          : "#3b82f6",
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await adminDb.collection("branding_configs").doc(docId).set(branding, { merge: true });

    return NextResponse.json({ branding });
  } catch (error) {
    console.error("Save branding error:", error);
    return NextResponse.json(
      { message: "Failed to save branding." },
      { status: 500 }
    );
  }
}


