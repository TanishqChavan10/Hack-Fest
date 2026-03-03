// POST /api/webhooks/github
// Phase 2 — GitHub webhook listener for push events.
// When a candidate pushes code, their profile skills auto-update.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const event = request.headers.get("x-github-event");

    // TODO Phase 2: Verify signature and trigger GitHub sync background job
    console.log("[GITHUB WEBHOOK]", event, payload?.repository?.full_name);

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
