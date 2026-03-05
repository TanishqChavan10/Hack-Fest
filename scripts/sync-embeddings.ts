
import { PrismaClient } from "@prisma/client";
import { generateEmbedding, buildCandidateProfileText } from "../services/gemini";
import { upsertCandidateEmbedding } from "../lib/supabase";

const prisma = new PrismaClient();

async function syncEmbeddings() {
    console.log("🔍 Starting Candidate Embedding Sync...");

    try {
        const candidates = await prisma.candidateProfile.findMany({
            where: { isOpenToWork: true },
        });

        console.log(`📡 Found ${candidates.length} candidates to process.`);

        for (const candidate of candidates) {
            console.log(`   ⚙️ Processing: ${candidate.userId}...`);

            const text = buildCandidateProfileText({
                headline: candidate.headline,
                bio: candidate.bio,
                hardSkills: candidate.hardSkills as any,
                softSkills: candidate.softSkills as any,
                yearsOfExp: candidate.yearsOfExp,
            });

            console.log(`      Generating embedding...`);
            const embedding = await generateEmbedding(text, "RETRIEVAL_DOCUMENT");

            console.log(`      Uploading to Supabase...`);
            await upsertCandidateEmbedding(candidate.userId, embedding, {
                name: candidate.userId,
                updatedAt: new Date().toISOString(),
            });

            console.log(`      ✅ Success.`);
        }

        console.log("\n✨ All embeddings synchronized successfully!");
    } catch (error: any) {
        console.error("\n SYNC FAILED:");
        console.error(error.message);
        if (error.response?.data) {
            console.error("Supabase Error details:", error.response.data);
        }
    } finally {
        await prisma.$disconnect();
    }
}

syncEmbeddings();
