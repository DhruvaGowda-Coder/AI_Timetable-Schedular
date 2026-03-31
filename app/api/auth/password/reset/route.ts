import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = resetSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid reset payload." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  if (!useDatabase) {
    return NextResponse.json(
      { message: "Password reset is unavailable because database is not configured." },
      { status: 503 }
    );
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

  const valid = await compare(parsed.data.code, otp.codeHash);
  if (!valid) {
    return NextResponse.json({ message: "Incorrect OTP." }, { status: 401 });
  }

  const usersRef = adminDb.collection("users");
  const userSnapshot = await usersRef.where("email", "==", email).get();

  const batch = adminDb.batch();
  batch.update(otpRef.doc(otpDoc.id), { consumedAt: new Date() });

  if (!userSnapshot.empty) {
    userSnapshot.docs.forEach((doc) => {
      batch.update(usersRef.doc(doc.id), { 
        // We have to await the hash outside the loop or batch, wait I did it in the loop but since it's an async hash, I'll do it before.
        // Wait, I can't await inside forEach safely if I want batch execution immediately after.
      });
    });
  }
  
  const hashedPassword = await hash(parsed.data.newPassword, 10);
  
  if (!userSnapshot.empty) {
    userSnapshot.docs.forEach((doc) => {
      batch.update(usersRef.doc(doc.id), { passwordHash: hashedPassword });
    });
  }

  await batch.commit();

  return NextResponse.json({ message: "Password reset successful." });
}


