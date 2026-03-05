// GET /api/admin/stats — Platform-wide analytics
// Protected: ADMIN role only
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Run all counts in parallel for speed
        const [
            totalUsers,
            totalCandidates,
            totalRecruiters,
            totalJobs,
            publishedJobs,
            totalApplications,
            totalMatches,
            recentUsers,
            topSkillsRaw,
        ] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { role: "CANDIDATE" } }),
            db.user.count({ where: { role: "RECRUITER" } }),
            db.job.count(),
            db.job.count({ where: { status: "PUBLISHED" } }),
            db.application.count(),
            db.match.count(),
            db.user.findMany({
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    image: true,
                },
            }),
            db.candidateProfile.findMany({
                select: { hardSkills: true },
            }),
        ]);

        // Aggregate top skills across all candidates
        const skillCounts: Record<string, { total: number; count: number }> = {};
        for (const profile of topSkillsRaw) {
            const skills = (profile.hardSkills as Record<string, number>) ?? {};
            for (const [skill, level] of Object.entries(skills)) {
                const key = skill.toLowerCase().trim();
                if (!skillCounts[key]) skillCounts[key] = { total: 0, count: 0 };
                skillCounts[key].total += level;
                skillCounts[key].count += 1;
            }
        }

        const topSkills = Object.entries(skillCounts)
            .map(([skill, { total, count }]) => ({
                skill,
                avgLevel: Math.round((total / count) * 10) / 10,
                candidateCount: count,
            }))
            .sort((a, b) => b.candidateCount - a.candidateCount)
            .slice(0, 15);

        // Average match score
        const matchStats = await db.match.aggregate({
            _avg: { score: true },
            _max: { score: true },
            _min: { score: true },
        });

        return NextResponse.json({
            data: {
                users: {
                    total: totalUsers,
                    candidates: totalCandidates,
                    recruiters: totalRecruiters,
                },
                jobs: {
                    total: totalJobs,
                    published: publishedJobs,
                },
                applications: totalApplications,
                matches: {
                    total: totalMatches,
                    avgScore: Math.round(matchStats._avg.score ?? 0),
                    maxScore: matchStats._max.score ?? 0,
                    minScore: matchStats._min.score ?? 0,
                },
                topSkills,
                recentUsers,
            },
        });
    } catch (error) {
        console.error("[ADMIN STATS]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
