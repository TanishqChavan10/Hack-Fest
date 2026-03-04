// PATCH /api/match/shortlist
// Toggle shortlist status for a candidate on a job.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const ShortlistSchema = z.object({
  jobId: z.string(),
  candidateId: z.string(),
  isShortlisted: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ShortlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { jobId, candidateId, isShortlisted } = parsed.data;

    // Verify recruiter owns this job
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job || job.recruiterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const match = await db.match.update({
      where: { jobId_candidateId: { jobId, candidateId } },
      data: { isShortlisted },
    });

    return NextResponse.json({ data: match });
  } catch (error) {
    console.error("[SHORTLIST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
