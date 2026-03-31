import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { admin } from "@/lib/firebase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId || shareId.length < 4) {
      return NextResponse.json(
        { message: "Invalid share ID." },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("shared_timetables").doc(shareId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { message: "Shared timetable not found or has expired." },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    // Check expiry
    if (data.expiresAt) {
      const expiresDate =
        typeof data.expiresAt.toDate === "function"
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
      if (expiresDate < new Date()) {
        return NextResponse.json(
          { message: "This share link has expired." },
          { status: 410 }
        );
      }
    }

    const url = new URL(_request.url);
    const facultyFilter = url.searchParams.get("faculty");

    if (facultyFilter && data.variantData?.slots) {
      data.variantData.slots = data.variantData.slots.filter(
        (s: any) => s.faculty === facultyFilter
      );
    }

    // Increment view count atomically
    await docRef
      .update({ viewCount: admin.firestore.FieldValue.increment(1) })
      .catch(() => null);

    return NextResponse.json({
      variantData: data.variantData,
      days: data.days ?? [],
      slotLabels: data.slotLabels ?? [],
      constraints: data.constraints ?? null,
      viewCount: (data.viewCount ?? 0) + 1,
      createdAt:
        typeof data.createdAt?.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
    });
  } catch (error) {
    console.error("Share fetch error:", error);
    return NextResponse.json(
      { message: "Failed to load shared timetable." },
      { status: 500 }
    );
  }
}
