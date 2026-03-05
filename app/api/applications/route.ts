// GET /api/applications — List all applications for the logged-in candidate
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "CANDIDATE") {
      return NextResponse.json(
        { error: "Only candidates can view applications" },
        { status: 403 }
      );
    }

    // Optional status filter
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status"); // PENDING | SHORTLISTED | REJECTED | HIRED

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (
      statusFilter &&
      ["PENDING", "SHORTLISTED", "REJECTED", "HIRED"].includes(statusFilter)
    ) {
      where.status = statusFilter;
    }

    const applications = await db.application.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            isRemote: true,
            experienceLevel: true,
            salaryMin: true,
            salaryMax: true,
            status: true,
            createdAt: true,
            recruiterProfile: {
              select: {
                companyName: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error("[GET /api/applications]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
