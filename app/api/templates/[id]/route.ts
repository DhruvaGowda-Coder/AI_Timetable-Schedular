import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId, getCurrentWorkspaceId } from "@/lib/system-user";

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
    const doc = await adminDb.collection("scheduler_templates").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { message: "Template not found." },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    const workspaceId = await getCurrentWorkspaceId();

    if (data.userId !== (workspaceId || userId)) {
      return NextResponse.json(
        { message: "Template not found." },
        { status: 404 }
      );
    }

    // Increment usage count
    await doc.ref.update({ usageCount: (data.usageCount ?? 0) + 1 });

    return NextResponse.json({
      template: {
        id: doc.id,
        name: data.name,
        description: data.description ?? "",
        constraints: data.constraints,
        breaks: data.breaks ?? [],
        createdAt:
          typeof data.createdAt?.toDate === "function"
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        usageCount: (data.usageCount ?? 0) + 1,
      },
    });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { message: "Failed to load template." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const doc = await adminDb.collection("scheduler_templates").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { message: "Template not found." },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    const workspaceId = await getCurrentWorkspaceId();

    if (data.userId !== (workspaceId || userId)) {
      return NextResponse.json(
        { message: "Template not found." },
        { status: 404 }
      );
    }

    await doc.ref.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { message: "Failed to delete template." },
      { status: 500 }
    );
  }
}
