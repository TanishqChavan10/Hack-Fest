// ============================================================
// This NextAuth route is deprecated — Supabase Auth is now used.
// Kept as a no-op to prevent 404 for any lingering NextAuth requests.
// ============================================================
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}

export async function POST() {
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
