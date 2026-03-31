import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";
import { getAppBaseUrl } from "@/lib/env";
import type { TimetableVariant, SchedulerConstraints } from "@/lib/types";

const SHARE_EXPIRY_DAYS = 30;

export async function POST(request: Request) {
  try {
    const userId = await getSystemUserId();

    const body = await request.json().catch(() => null);
    if (!body?.variant) {
      return NextResponse.json(
        { message: "Missing variant data." },
        { status: 400 }
      );
    }

    const variant = body.variant as TimetableVariant;
    const constraints = body.constraints as SchedulerConstraints | undefined;
    const days = body.days as string[] | undefined;
    const slotLabels = body.slotLabels as string[] | undefined;

    const shareId = nanoid(8);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const shareData = {
      shareId,
      variantData: {
        name: variant.name,
        score: variant.score,
        slots: variant.slots,
      },
      days: days ?? [],
      slotLabels: slotLabels ?? [],
      constraints: constraints
        ? {
            days: constraints.days,
            slotsPerDay: constraints.slotsPerDay,
            slotTimings: constraints.slotTimings,
          }
        : null,
      createdBy: userId ?? "anonymous",
      createdAt: now,
      expiresAt,
      viewCount: 0,
    };

    await adminDb.collection("shared_timetables").doc(shareId).set(shareData);

    const baseUrl = getAppBaseUrl(request);
    const shareUrl = `${baseUrl}/share/${shareId}`;

    return NextResponse.json({ shareId, shareUrl });
  } catch (error) {
    console.error("Share creation error:", error);
    return NextResponse.json(
      { message: "Failed to create share link." },
      { status: 500 }
    );
  }
}


