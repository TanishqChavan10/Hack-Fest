// GET /api/gap-analysis?jobId=xxx — Skill gap analysis for a candidate vs a job
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
    calculateMatchScore,
    type CategoryWeights,
    type JobRequirement,
} from "@/lib/matching";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.role !== "CANDIDATE") {
            return NextResponse.json(
                { error: "Only candidates can view gap analysis" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json(
                { error: "jobId query parameter is required" },
                { status: 400 }
            );
        }

        // Fetch job with requirements
        const job = await db.job.findUnique({
            where: { id: jobId },
            include: {
                requirements: true,
                recruiterProfile: {
                    select: { companyName: true },
                },
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Fetch candidate profile
        const profile = await db.candidateProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
        }

        const hardSkills = (profile.hardSkills as Record<string, number>) ?? {};
        const softSkills = (profile.softSkills as Record<string, number>) ?? {};
        const categoryWeights = (job.categoryWeights as unknown as CategoryWeights) ?? {
            technicalSkills: 0.6,
            softSkills: 0.2,
            experience: 0.2,
        };

        // Build requirements in the format matching.ts expects
        const requirements: JobRequirement[] = job.requirements.map((r) => ({
            skillName: r.skillName,
            minLevel: r.minLevel,
            weight: r.weight,
            isMandatory: r.isMandatory,
        }));

        // Calculate overall match
        const { score, breakdown } = calculateMatchScore(
            hardSkills,
            softSkills,
            profile.yearsOfExp,
            requirements,
            categoryWeights
        );

        // Per-skill gap analysis
        const skills = job.requirements.map((req) => {
            const candidateLevel = hardSkills[req.skillName] ?? 0;
            const gap = req.minLevel - candidateLevel;

            let suggestion: string;
            if (candidateLevel === 0) {
                suggestion = `Start learning ${req.skillName} — this skill is ${req.isMandatory ? "mandatory" : "important"} for this role`;
            } else if (gap > 3) {
                suggestion = `Significant gap — consider focused training or projects in ${req.skillName}`;
            } else if (gap > 0) {
                suggestion = `Close to the requirement — practice more to reach level ${req.minLevel}`;
            } else if (gap === 0) {
                suggestion = "You meet the exact requirement";
            } else {
                suggestion = "You exceed the requirement — great fit!";
            }

            return {
                skill: req.skillName,
                candidateLevel,
                requiredLevel: req.minLevel,
                gap: Math.max(gap, 0),
                isMandatory: req.isMandatory,
                weight: req.weight,
                suggestion,
            };
        });

        return NextResponse.json({
            data: {
                jobId: job.id,
                jobTitle: job.title,
                companyName: job.recruiterProfile?.companyName ?? null,
                matchScore: score,
                breakdown,
                skills,
            },
        });
    } catch (error) {
        console.error("[GET /api/gap-analysis]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
