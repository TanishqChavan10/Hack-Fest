// GET /api/jobs - List published jobs (for candidates)
// POST /api/jobs - Create a new job (for recruiters)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

// -------------------------------------------------------
// GET: Candidate view — list all published jobs
// -------------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10");
    const search = searchParams.get("search") ?? "";
    const level = searchParams.get("level");

    const where = {
      status: "PUBLISHED" as const,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(level && { experienceLevel: level as never }),
    };

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        include: {
          requirements: true,
          recruiterProfile: {
            select: { companyName: true, logoUrl: true, location: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      data: jobs,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error("[JOBS GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// -------------------------------------------------------
// POST: Recruiter creates a job
// -------------------------------------------------------
const RequirementSchema = z.object({
  skillName: z.string().min(1),
  minLevel: z.number().int().min(1).max(10),
  weight: z.number().min(0).max(1),
  isMandatory: z.boolean(),
});

const JobCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description is too short"),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  experienceLevel: z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  requirements: z.array(RequirementSchema),
  categoryWeights: z.object({
    technicalSkills: z.number().min(0).max(1),
    softSkills: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
  }),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = JobCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { requirements, ...jobData } = parsed.data;

    const job = await db.job.create({
      data: {
        ...jobData,
        recruiterId: session.user.id,
        requirements: {
          create: requirements.map((r) => ({
            ...r,
            skillName: r.skillName.toLowerCase().trim(),
          })),
        },
      },
      include: { requirements: true },
    });

    return NextResponse.json({ data: job }, { status: 201 });
  } catch (error) {
    console.error("[JOBS POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
