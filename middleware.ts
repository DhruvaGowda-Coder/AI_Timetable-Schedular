import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Allow guests across app routes. Payment/subscription actions are guarded at API level.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}


