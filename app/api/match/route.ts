// GET /api/match?jobId=xxx
// Returns candidates ranked by their match score for a specific job.
// Server-side only — never expose raw skill data to client without auth.
// NOTE: @ts-nocheck here because Prisma types are generated at `prisma generate`.
// Remove after running `npm run db:generate`.
// @ts-nocheck
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { rankCandidates } from "@/lib/matching";
import type { CategoryWeights, JobRequirementData } from "@/types";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // 1. Fetch job with requirements — verify recruiter owns the job
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { requirements: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.recruiterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categoryWeights = job.categoryWeights as CategoryWeights;
    const requirements = job.requirements as JobRequirementData[];

    // 2. Fetch all open-to-work candidates
    const candidates = await db.candidateProfile.findMany({
      where: { isOpenToWork: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // 3. Check for cached scores in the Match table
    const existingMatches = await db.match.findMany({
      where: { jobId },
    });
    const cachedCandidateIds = new Set(existingMatches.map((m) => m.candidateId));

    // 4. Find candidates that need (re-)calculation
    const needsCalc = candidates.filter(
      (c) => !cachedCandidateIds.has(c.id)
    );

    // 5. Rank uncached candidates
    const ranked = rankCandidates(
      needsCalc.map((c) => ({
        id: c.id,
        hardSkills: c.hardSkills,
        softSkills: c.softSkills,
        yearsOfExp: c.yearsOfExp,
      })),
      requirements,
      categoryWeights,
      job.experienceLevel === "ENTRY" ? 0 :
        job.experienceLevel === "MID" ? 2 :
          job.experienceLevel === "SENIOR" ? 5 : 10
    );

    // 6. Upsert new scores into the Match cache table
    if (ranked.length > 0) {
      await db.$transaction(
        ranked.map((r) =>
          db.match.upsert({
            where: { jobId_candidateId: { jobId, candidateId: r.id } },
            create: {
              jobId,
              candidateId: r.id,
              score: r.matchScore,
              breakdown: r.breakdown,
              isMandatoryPass: r.isMandatoryPass,
            },
            update: {
              score: r.matchScore,
              breakdown: r.breakdown,
              isMandatoryPass: r.isMandatoryPass,
            },
          })
        )
      );
    }

    // 7. Merge cached + newly-calculated scores
    type ScoreEntry = { score: number; breakdown: unknown; isMandatoryPass: boolean; isShortlisted: boolean };
    const scoreMap = new Map<string, ScoreEntry>();

    for (const entry of existingMatches) {
      scoreMap.set(entry.candidateId, {
        score: entry.score,
        breakdown: entry.breakdown,
        isMandatoryPass: entry.isMandatoryPass,
        isShortlisted: entry.isShortlisted,
      });
    }
    for (const r of ranked) {
      scoreMap.set(r.id, {
        score: r.matchScore,
        breakdown: r.breakdown,
        isMandatoryPass: r.isMandatoryPass,
        isShortlisted: false,
      });
    }

    // 8. Build final response, sorted by score
    const result = candidates
      .map((c) => {
        const match = scoreMap.get(c.id);
        return {
          candidateId: c.id,
          score: match?.score ?? 0,
          breakdown: match?.breakdown ?? {},
          isMandatoryPass: match?.isMandatoryPass ?? true,
          isShortlisted: match?.isShortlisted ?? false,
          candidate: {
            id: c.id,
            headline: c.headline,
            location: c.location,
            experienceLevel: c.experienceLevel,
            yearsOfExp: c.yearsOfExp,
            hardSkills: c.hardSkills,
            githubUsername: c.githubUsername,
            user: c.user,
          },
          jobRequirements: requirements,
        };
      })
      .sort((a, b) => {
        if (a.isMandatoryPass !== b.isMandatoryPass) {
          return a.isMandatoryPass ? -1 : 1;
        }
        return b.score - a.score;
      });

    return NextResponse.json({ data: result, total: result.length });
  } catch (error) {
    console.error("[MATCH API]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
