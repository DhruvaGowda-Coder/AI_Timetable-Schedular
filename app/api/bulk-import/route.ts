import { NextResponse } from "next/server";
import { parseSchedulerExcel } from "@/lib/import-utils";
import { env } from "@/lib/env";
import { getUserBillingSummary } from "@/lib/subscription";
import { getSystemUserId } from "@/lib/system-user";

export async function POST(request: Request) {
  try {
    const userId = env.DATABASE_URL ? await getSystemUserId() : null;

    const billingSummary = await getUserBillingSummary(userId);
    if (!billingSummary.features.bulkGeneration) {
      return NextResponse.json(
        {
          message: "Excel import is available on Pro plans and above.",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const constraints = await parseSchedulerExcel(buffer);

    return NextResponse.json({
      message: "File parsed successfully in backend.",
      constraints,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: "Failed to parse file. Ensure it matches the template." },
      { status: 500 }
    );
  }
}


