// GET /api/profile - Get current user's candidate profile
// PATCH /api/profile - Update candidate profile
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.candidateProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error("[PROFILE GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const SkillEntrySchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(1).max(10),
});

const ProfileUpdateSchema = z.object({
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(100).optional(),
  phoneNumber: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUsername: z.string().optional(),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  yearsOfExp: z.number().int().min(0).max(50).optional(),
  experienceLevel: z
    .enum(["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"])
    .optional(),
  isOpenToWork: z.boolean().optional(),
  hardSkills: z.array(SkillEntrySchema).optional(),
  softSkills: z.array(SkillEntrySchema).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { hardSkills, softSkills, ...rest } = parsed.data;

    // Convert skill arrays to SkillMap objects: [{name: "React", level: 8}] → {"react": 8}
    const hardSkillMap = hardSkills
      ? Object.fromEntries(
          hardSkills.map((s) => [s.name.toLowerCase().trim(), s.level])
        )
      : undefined;

    const softSkillMap = softSkills
      ? Object.fromEntries(
          softSkills.map((s) => [s.name.toLowerCase().trim(), s.level])
        )
      : undefined;

    const updated = await db.candidateProfile.update({
      where: { userId: session.user.id },
      data: {
        ...rest,
        ...(hardSkillMap !== undefined && { hardSkills: hardSkillMap }),
        ...(softSkillMap !== undefined && { softSkills: softSkillMap }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PROFILE PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
