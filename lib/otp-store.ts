import { hash, compare } from "bcryptjs";

interface InMemoryOtp {
  codeHash: string;
  expiresAt: number;
}

const otpMemoryStore = new Map<string, InMemoryOtp>();

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function saveOtpInMemory(email: string, code: string, expiresAt: Date) {
  otpMemoryStore.set(email.toLowerCase(), {
    codeHash: await hash(code, 10),
    expiresAt: expiresAt.getTime(),
  });
}

export async function verifyOtpInMemory(email: string, code: string) {
  const entry = otpMemoryStore.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(email.toLowerCase());
    return false;
  }
  const valid = await compare(code, entry.codeHash);
  if (valid) otpMemoryStore.delete(email.toLowerCase());
  return valid;
}


