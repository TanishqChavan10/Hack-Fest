import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Only candidates can apply" }, { status: 403 });
    }

    const candidateProfile = await db.candidateProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!candidateProfile) {
      return NextResponse.json({ error: "Complete your profile before applying" }, { status: 400 });
    }

    const job = await db.job.findUnique({
      where: { id: params.id, status: "PUBLISHED" },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check for duplicate application
    const existing = await db.application.findFirst({
      where: { jobId: params.id, userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Already applied to this job" }, { status: 409 });
    }

    const application = await db.application.create({
      data: {
        jobId: params.id,
        userId: session.user.id,
        candidateId: candidateProfile.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/jobs/[id]/apply]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
