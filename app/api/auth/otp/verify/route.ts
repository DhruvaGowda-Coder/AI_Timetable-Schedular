import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { verifyOtpInMemory } from "@/lib/otp-store";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid OTP payload." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const code = parsed.data.code;

  if (!useDatabase) {
    const valid = await verifyOtpInMemory(email, code);
    if (!valid) {
      return NextResponse.json({ message: "Incorrect or expired OTP." }, { status: 401 });
    }
    return NextResponse.json({ message: "OTP verified successfully." });
  }

  const otpRef = adminDb.collection("otpCodes");
  const snapshot = await otpRef
    .where("email", "==", email)
    .where("consumedAt", "==", null)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ message: "No valid OTP found." }, { status: 404 });
  }

  const otpDoc = snapshot.docs[0];
  const otp = otpDoc.data();

  let isExpired = true;
  if (otp.expiresAt && typeof otp.expiresAt.toDate === "function") {
    isExpired = otp.expiresAt.toDate() <= new Date();
  } else if (otp.expiresAt) {
    isExpired = new Date(otp.expiresAt) <= new Date();
  }

  if (isExpired) {
    return NextResponse.json({ message: "Incorrect or expired OTP." }, { status: 401 });
  }

  const valid = await compare(code, otp.codeHash);
  if (!valid) {
    return NextResponse.json({ message: "Incorrect OTP." }, { status: 401 });
  }

  await otpRef.doc(otpDoc.id).update({ consumedAt: new Date() });

  return NextResponse.json({ message: "OTP verified successfully." });
}


