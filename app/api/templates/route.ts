import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebase-admin";
import { getSystemUserId, getCurrentWorkspaceId } from "@/lib/system-user";
import { getUserBillingSummary } from "@/lib/subscription";

export async function GET() {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();

    const snapshot = await adminDb
      .collection("scheduler_templates")
      .where("userId", "==", workspaceId || userId)
      .orderBy("createdAt", "desc")
      .get();

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description ?? "",
        constraints: data.constraints,
        breaks: data.breaks ?? [],
        createdAt:
          typeof data.createdAt?.toDate === "function"
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        usageCount: data.usageCount ?? 0,
      };
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("List templates error:", error);
    return NextResponse.json(
      { message: "Failed to list templates." },
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
    const templateLimit = billing.features.maxTemplates;

    const workspaceId = await getCurrentWorkspaceId();

    // Check limit (-1 means unlimited)
    if (templateLimit >= 0) {
      const existing = await adminDb
        .collection("scheduler_templates")
        .where("userId", "==", workspaceId || userId)
        .get();

      if (existing.size >= templateLimit) {
        return NextResponse.json(
          {
            message: `Template limit reached (${templateLimit}). ${billing.currentPlan === "free" ? "Upgrade to Pro for more templates." : "Delete existing templates to save new ones."}`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => null);
    if (!body?.name?.trim() || !body?.constraints) {
      return NextResponse.json(
        { message: "Template name and constraints are required." },
        { status: 400 }
      );
    }

    const templateRef = adminDb.collection("scheduler_templates").doc();
    const template = {
      userId: workspaceId || userId,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      constraints: body.constraints,
      breaks: body.breaks ?? [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usageCount: 0,
    };

    await templateRef.set(template);

    return NextResponse.json({
      template: { id: templateRef.id, ...template, createdAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { message: "Failed to save template." },
      { status: 500 }
    );
  }
}


