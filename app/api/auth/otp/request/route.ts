import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { env, hasSmtpConfig } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { generateOtpCode, saveOtpInMemory } from "@/lib/otp-store";

const requestSchema = z.object({
  email: z.string().email(),
});

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const code = generateOtpCode();
  const expiresAt = addMinutes(new Date(), 10);

  if (useDatabase) {
    await adminDb.collection("otpCodes").add({
      email,
      codeHash: await hash(code, 10),
      expiresAt: new Date(expiresAt),
      consumedAt: null,
      createdAt: new Date(),
    });
  } else {
    await saveOtpInMemory(email, code, expiresAt);
  }

  let emailSent = false;
  if (hasSmtpConfig) {
    const { sendEmail } = await import("@/lib/email");
    emailSent = await sendEmail({
      to: email,
      subject: "Your Schedulr AI Login OTP Code",
      text: `Your OTP is: ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Schedulr AI Login</h2>
        <p>Your OTP code is:</p>
        <h1 style="letter-spacing: 5px; background: #f4f4f5; padding: 10px; display: inline-block;">${code}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>`,
    });
  }

  if (!emailSent) {
    return NextResponse.json(
      { message: "Unable to send OTP email. Check SMTP configuration." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    message: "OTP sent to your email.",
    expiresAt: expiresAt.toISOString(),
  });
}


