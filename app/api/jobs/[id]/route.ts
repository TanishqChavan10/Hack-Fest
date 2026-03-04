// GET /api/jobs/[id] - Get single job
// PATCH /api/jobs/[id] - Update job (recruiter only)
// DELETE /api/jobs/[id] - Delete / archive job (recruiter only)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const job = await db.job.findUnique({
      where: { id: params.id },
      include: {
        requirements: true,
        recruiterProfile: {
          select: { companyName: true, logoUrl: true, location: true, website: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only return published jobs to public; draft visible to recruiter
    const session = await getSession();
    if (job.status !== "PUBLISHED") {
      if (!session || session.user.id !== job.recruiterId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("[JOB GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await db.job.findUnique({ where: { id: params.id } });
    if (!job || job.recruiterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updated = await db.job.update({
      where: { id: params.id },
      data: body,
      include: { requirements: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[JOB PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await db.job.findUnique({ where: { id: params.id } });
    if (!job || job.recruiterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.job.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ message: "Job archived successfully." });
  } catch (error) {
    console.error("[JOB DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
