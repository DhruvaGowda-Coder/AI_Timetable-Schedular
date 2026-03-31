import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { env } from "@/lib/env";

const signupSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  acceptTerms: z.boolean().refine((value) => value, {
    message: "You must accept the Terms before creating an account.",
  }),
});

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid signup input.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!useDatabase) {
    return NextResponse.json(
      { message: "Signup is unavailable because database is not configured." },
      { status: 503 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const usersRef = adminDb.collection("users");
  const existing = await usersRef.where("email", "==", email).limit(1).get();

  if (!existing.empty) {
    return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 10);
  await usersRef.add({
    email,
    name: parsed.data.fullName,
    passwordHash,
    tier: "FREE",
    subscriptionStatus: "inactive",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ message: "Account created successfully." });
}


