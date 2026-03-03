// GET /api/recruiter/jobs - List jobs for the currently signed-in recruiter
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await db.job.findMany({
      where: { recruiterId: session.user.id },
      include: {
        requirements: true,
        _count: { select: { applications: true, matches: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: jobs });
  } catch (error) {
    console.error("[RECRUITER JOBS]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
