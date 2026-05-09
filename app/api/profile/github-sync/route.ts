// POST /api/profile/github-sync — Sync GitHub repos → auto-populate skills
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { fetchGitHubProfile } from "@/lib/github";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.role !== "CANDIDATE") {
            return NextResponse.json(
                { error: "Only candidates can sync GitHub" },
                { status: 403 }
            );
        }

        // Fetch existing profile
        const profile = await db.candidateProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
        }

        // Use username from request body if provided, otherwise fall back to DB value
        let githubUsername: string | null | undefined;
        try {
            const body = await request.json();
            githubUsername = body?.githubUsername?.trim() || profile.githubUsername;
        } catch {
            githubUsername = profile.githubUsername;
        }

        if (!githubUsername) {
            return NextResponse.json(
                { error: "Set your GitHub username in your profile first" },
                { status: 400 }
            );
        }

        // Fetch GitHub data
        const ghProfile = await fetchGitHubProfile(githubUsername);

        // Merge: keep existing manual skills, overlay GitHub-derived skills
        const existingSkills = (profile.hardSkills as Record<string, number>) ?? {};
        const mergedSkills: Record<string, number> = { ...existingSkills };

        for (const [skill, level] of Object.entries(ghProfile.derivedSkills)) {
            // Only update if GitHub level is higher or skill doesn't exist yet
            if (!mergedSkills[skill] || mergedSkills[skill] < level) {
                mergedSkills[skill] = level;
            }
        }

        // Update profile
        const updated = await db.candidateProfile.update({
            where: { userId: session.user.id },
            data: {
                hardSkills: mergedSkills,
                githubStats: {
                    publicRepos: ghProfile.publicRepos,
                    followers: ghProfile.followers,
                    following: ghProfile.following,
                    totalStars: ghProfile.totalStars,
                    topLanguages: ghProfile.topLanguages,
                    repos: ghProfile.repos.slice(0, 5).map((r) => ({
                        name: r.name,
                        description: r.description,
                        language: r.language,
                        stars: r.stargazersCount,
                        url: r.url,
                    })),
                },
                lastGithubSync: new Date(),
            },
        });

        return NextResponse.json({
            data: updated,
            message: `Synced ${Object.keys(ghProfile.derivedSkills).length} skills from ${ghProfile.repos.length} repos`,
        });
    } catch (error) {
        console.error("[POST /api/profile/github-sync]", error);
        return NextResponse.json(
            { error: "Failed to sync GitHub profile. Check your username and try again." },
            { status: 500 }
        );
    }
}
