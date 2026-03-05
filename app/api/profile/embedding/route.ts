// POST /api/profile/embedding — Generate AI embedding for candidate profile
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
    buildCandidateProfileText,
    generateEmbedding,
} from "@/services/gemini";
import { upsertCandidateEmbedding } from "@/lib/supabase";

export async function POST() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.role !== "CANDIDATE") {
            return NextResponse.json(
                { error: "Only candidates can generate embeddings" },
                { status: 403 }
            );
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

        if (Object.keys(hardSkills).length === 0) {
            return NextResponse.json(
                { error: "Add at least one skill to your profile before generating an AI profile" },
                { status: 400 }
            );
        }

        // Build text representation → generate embedding
        const profileText = buildCandidateProfileText({
            headline: profile.headline,
            bio: profile.bio,
            hardSkills,
            softSkills,
            yearsOfExp: profile.yearsOfExp,
        });

        const embedding = await generateEmbedding(profileText);

        // Upsert into pgvector table
        await upsertCandidateEmbedding(profile.userId, embedding, {
            name: session.user.name ?? "",
            headline: profile.headline ?? "",
            skills: Object.keys(hardSkills),
        });

        return NextResponse.json({
            success: true,
            dimensions: embedding.length,
            message: "AI profile generated successfully! Recruiters can now find you via semantic search.",
        });
    } catch (error) {
        console.error("[POST /api/profile/embedding]", error);
        return NextResponse.json(
            { error: "Failed to generate AI profile. Please try again." },
            { status: 500 }
        );
    }
}
